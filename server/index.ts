import express from 'express'
import cors from 'cors'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server, type Socket } from 'socket.io'
import {
  buildSnapshot,
  createRedisAdapterClients,
  flushPersist,
  initPersist,
  loadSnapshot,
  persistDiagnostics,
  scheduleSave,
  subscribeRoomUpdates,
} from './persist.js'
import {
  allRooms,
  backToLobby,
  closeLobby,
  createRoom,
  endChallenge,
  endGame,
  getBinding,
  getRoom,
  handleDisconnect,
  hydrateRoom,
  joinRoom,
  nextRound,
  onPhaseTimeout,
  previewRoom,
  pruneIdleRooms,
  reconnectSocket,
  reloadRoomFromStore,
  restoreRooms,
  roomsNeedingTick,
  scorePlayer,
  setBroadcastHook,
  setMaxRounds,
  setPersistHook,
  startGame,
  submitResponse,
  toPublicRoom,
} from './rooms.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 3001
const isProd = process.env.NODE_ENV === 'production'

const app = express()
const httpServer = createServer(app)

function resolveCorsOrigin():
  | boolean
  | string[]
  | ((origin: string | undefined, cb: (err: Error | null, allow?: boolean | string) => void) => void) {
  const extras =
    process.env.CORS_ORIGIN?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? []
  const allowed = new Set([
    'https://yourtaskis.com',
    'https://www.yourtaskis.com',
    ...extras,
  ])

  return (origin, cb) => {
    if (!origin) {
      cb(null, true)
      return
    }
    if (
      allowed.has(origin) ||
      origin.endsWith('.up.railway.app') ||
      origin.endsWith('.workers.dev') ||
      origin.startsWith('http://localhost:')
    ) {
      cb(null, origin)
      return
    }
    cb(null, false)
  }
}

const corsOrigin = resolveCorsOrigin()

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

function persistNow() {
  scheduleSave(buildSnapshot(allRooms()))
}

setPersistHook(persistNow)
setBroadcastHook(broadcastRoom)

function socketsInRoom(code: string, exceptPlayerId?: string): Socket[] {
  const out: Socket[] = []
  for (const [, socket] of io.of('/').sockets) {
    const binding = getBinding(socket.id)
    if (!binding || binding.code !== code) continue
    if (exceptPlayerId && binding.playerId === exceptPlayerId) continue
    out.push(socket)
  }
  return out
}

function broadcastRoom(code: string) {
  const room = getRoom(code)
  if (!room) return
  for (const [, socket] of io.of('/').sockets) {
    const binding = getBinding(socket.id)
    if (!binding || binding.code !== code) continue
    socket.emit('room', toPublicRoom(room, binding.playerId))
  }
}

app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'yourtaskis',
    rooms: [...allRooms()].length,
    persist: persistDiagnostics(),
  })
})

app.get('/api/room/:code/preview', async (req, res) => {
  const code = String(req.params.code ?? '')
  await hydrateRoom(code)
  const preview = previewRoom(code)
  if (!preview) {
    res.status(404).json({ error: 'Hittade inget spel med den koden' })
    return
  }
  res.json(preview)
})

io.on('connection', (socket) => {
  function bindingFrom(payload?: { code?: unknown; roomCode?: unknown; playerId?: unknown }) {
    let binding = getBinding(socket.id)
    const code = payload?.roomCode ?? payload?.code
    if (!binding && code && payload?.playerId) {
      const rebound = reconnectSocket(String(code), String(payload.playerId), socket.id)
      if (!('error' in rebound)) binding = getBinding(socket.id)
    }
    return binding
  }

  socket.on('create', async (payload, ack) => {
    try {
      const name = String(payload?.name ?? '')
      const { room, playerId } = createRoom(name, socket.id)
      persistNow()
      await flushPersist()
      ack?.({ ok: true, playerId, room: toPublicRoom(room, playerId) })
      broadcastRoom(room.code)
    } catch (e) {
      console.error(e)
      ack?.({ ok: false, error: 'Kunde inte skapa rum' })
    }
  })

  socket.on('join', async (payload, ack) => {
    try {
      const code = String(payload?.code ?? '')
      await hydrateRoom(code)
      const result = joinRoom(code, String(payload?.name ?? ''), socket.id)
      if ('error' in result) {
        ack?.({ ok: false, error: result.error })
        return
      }
      ack?.({
        ok: true,
        playerId: result.playerId,
        room: toPublicRoom(result.room, result.playerId),
      })
      broadcastRoom(result.room.code)
    } catch (e) {
      console.error(e)
      ack?.({ ok: false, error: 'Kunde inte gå med' })
    }
  })

  socket.on('rejoin', async (payload, ack) => {
    try {
      const code = String(payload?.code ?? '')
      await hydrateRoom(code)
      const result = reconnectSocket(code, String(payload?.playerId ?? ''), socket.id)
      if ('error' in result) {
        ack?.({ ok: false, error: result.error })
        return
      }
      const binding = getBinding(socket.id)
      ack?.({
        ok: true,
        playerId: binding!.playerId,
        room: toPublicRoom(result, binding!.playerId),
      })
      broadcastRoom(result.code)
    } catch (e) {
      console.error(e)
      ack?.({ ok: false, error: 'Kunde inte återansluta' })
    }
  })

  socket.on('setMaxRounds', async (payload, ack) => {
    try {
      const code = String(payload?.roomCode ?? payload?.code ?? '')
      if (code) await hydrateRoom(code)
      const binding = bindingFrom(payload)
      if (!binding) return ack?.({ ok: false, error: 'Inte i ett rum' })
      const result = setMaxRounds(binding.code, binding.playerId, Number(payload?.maxRounds ?? 0))
      if ('error' in result) return ack?.({ ok: false, error: result.error })
      ack?.({ ok: true, room: toPublicRoom(result, binding.playerId) })
      broadcastRoom(result.code)
    } catch (e) {
      console.error(e)
      ack?.({ ok: false, error: 'Kunde inte ändra antal rundor' })
    }
  })

  socket.on('startGame', (payload, ack) => {
    const binding = bindingFrom(payload)
    if (!binding) return ack?.({ ok: false, error: 'Inte i ett rum' })
    const result = startGame(binding.code, binding.playerId)
    if ('error' in result) return ack?.({ ok: false, error: result.error })
    ack?.({ ok: true, room: toPublicRoom(result, binding.playerId) })
    broadcastRoom(result.code)
  })

  socket.on('endChallenge', (payload, ack) => {
    const binding = bindingFrom(payload)
    if (!binding) return ack?.({ ok: false, error: 'Inte i ett rum' })
    const result = endChallenge(binding.code, binding.playerId)
    if ('error' in result) return ack?.({ ok: false, error: result.error })
    ack?.({ ok: true, room: toPublicRoom(result, binding.playerId) })
    broadcastRoom(result.code)
  })

  socket.on('submitResponse', (payload, ack) => {
    const binding = bindingFrom(payload)
    if (!binding) return ack?.({ ok: false, error: 'Inte i ett rum' })
    const result = submitResponse(binding.code, binding.playerId, String(payload?.payload ?? ''))
    if ('error' in result) return ack?.({ ok: false, error: result.error })
    ack?.({ ok: true, room: toPublicRoom(result, binding.playerId) })
    broadcastRoom(result.code)
  })

  socket.on('scorePlayer', (payload, ack) => {
    const binding = bindingFrom(payload)
    if (!binding) return ack?.({ ok: false, error: 'Inte i ett rum' })
    const result = scorePlayer(
      binding.code,
      binding.playerId,
      String(payload?.targetId ?? ''),
      Number(payload?.points ?? 0),
    )
    if ('error' in result) return ack?.({ ok: false, error: result.error })
    ack?.({ ok: true, room: toPublicRoom(result, binding.playerId) })
    broadcastRoom(result.code)
  })

  socket.on('nextRound', (payload, ack) => {
    const binding = bindingFrom(payload)
    if (!binding) return ack?.({ ok: false, error: 'Inte i ett rum' })
    const result = nextRound(binding.code, binding.playerId)
    if ('error' in result) return ack?.({ ok: false, error: result.error })
    ack?.({ ok: true, room: toPublicRoom(result, binding.playerId) })
    broadcastRoom(result.code)
  })

  socket.on('backToLobby', (payload, ack) => {
    const binding = bindingFrom(payload)
    if (!binding) return ack?.({ ok: false, error: 'Inte i ett rum' })
    const result = backToLobby(binding.code, binding.playerId)
    if ('error' in result) return ack?.({ ok: false, error: result.error })
    ack?.({ ok: true, room: toPublicRoom(result, binding.playerId) })
    broadcastRoom(result.code)
  })

  socket.on('closeLobby', async (payload, ack) => {
    try {
      const binding = bindingFrom(payload)
      if (!binding) return ack?.({ ok: false, error: 'Inte i ett rum' })
      const code = binding.code
      const notify = socketsInRoom(code, binding.playerId)
      const result = closeLobby(code, binding.playerId)
      if ('error' in result) return ack?.({ ok: false, error: result.error })
      for (const s of notify) s.emit('roomClosed', { reason: 'lobby' })
      await flushPersist()
      ack?.({ ok: true, closed: true })
    } catch (e) {
      console.error(e)
      ack?.({ ok: false, error: 'Kunde inte avsluta lobbyn' })
    }
  })

  socket.on('endGame', (payload, ack) => {
    const binding = bindingFrom(payload)
    if (!binding) return ack?.({ ok: false, error: 'Inte i ett rum' })
    const result = endGame(binding.code, binding.playerId)
    if ('error' in result) return ack?.({ ok: false, error: result.error })
    ack?.({ ok: true, room: toPublicRoom(result, binding.playerId) })
    broadcastRoom(result.code)
  })

  socket.on('disconnect', () => {
    const binding = getBinding(socket.id)
    handleDisconnect(socket.id)
    if (binding) broadcastRoom(binding.code)
  })
})

setInterval(() => {
  for (const room of roomsNeedingTick()) {
    onPhaseTimeout(room)
    broadcastRoom(room.code)
  }
}, 250)

setInterval(() => {
  pruneIdleRooms()
}, 30_000)

if (isProd) {
  const dist = path.join(__dirname, '../client/dist')
  app.use(express.static(dist))
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'))
  })
}

async function main() {
  const { backend } = await initPersist()
  const snap = await loadSnapshot()
  if (snap) {
    restoreRooms(snap.rooms)
    console.log(`Restored ${snap.rooms.length} rooms`)
  }
  console.log(`Persist backend: ${backend ?? 'memory'}`)
  if (!backend) {
    console.warn('WARNING: No REDIS_URL — rooms live only in memory.')
  }

  const adapterClients = await createRedisAdapterClients()
  if (adapterClients) {
    const { createAdapter } = await import('@socket.io/redis-adapter')
    io.adapter(createAdapter(adapterClients.pubClient, adapterClients.subClient))
    console.log('Socket.io Redis adapter enabled')
  }

  await subscribeRoomUpdates((code) => {
    void reloadRoomFromStore(code).then((room) => {
      if (room) broadcastRoom(code)
    })
  })

  httpServer.listen(PORT, () => {
    console.log(`Your Task Is API on :${PORT}`)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

process.on('SIGTERM', () => {
  void flushPersist().finally(() => process.exit(0))
})
