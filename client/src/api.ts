import { io, type Socket } from 'socket.io-client'
import { normalizePublicRoom } from './roomUtils'
import type { PublicRoom, Session } from './types'

const PRODUCTION_API = 'https://yourtaskis-production.up.railway.app'
const API_BASE = (import.meta.env.VITE_SOCKET_URL || PRODUCTION_API).replace(/\/$/, '')

let socket: Socket | null = null
let rejoinInFlight: Promise<{
  ok: boolean
  playerId?: string
  room?: PublicRoom
  error?: string
} | null> | null = null
let connectionListenersAttached = false
let boundSessionKey: string | null = null

function sessionKey(code: string, playerId: string) {
  return `${code.toUpperCase()}:${playerId}`
}

function markSessionBound(code: string, playerId: string) {
  boundSessionKey = sessionKey(code, playerId)
}

function isSessionBound() {
  const session = loadSession()
  if (!session || !boundSessionKey) return false
  return (
    boundSessionKey === sessionKey(session.code, session.playerId) &&
    Boolean(socket?.connected)
  )
}

type RoomHandler = (room: PublicRoom) => void
let onRoomHandler: RoomHandler | null = null
type RoomClosedHandler = () => void
let onRoomClosedHandler: RoomClosedHandler | null = null
type KickedHandler = () => void
let onKickedHandler: KickedHandler | null = null

export function getSocket() {
  if (!socket) {
    socket = io(API_BASE || undefined, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 5000,
      timeout: 20_000,
    })
  }

  if (!connectionListenersAttached) {
    connectionListenersAttached = true
    socket.on('connect', () => {
      void ensureSessionBound()
    })
    socket.on('disconnect', () => {
      boundSessionKey = null
    })
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && socket?.connected) {
          void ensureSessionBound()
        }
      })
    }
    socket.on('room', (room: PublicRoom) => {
      onRoomHandler?.(normalizePublicRoom(room))
    })
    socket.on('roomClosed', () => {
      clearSession()
      onRoomClosedHandler?.()
    })
    socket.on('kicked', () => {
      clearSession()
      onKickedHandler?.()
    })
  }

  return socket
}

export type ConnState = 'connected' | 'connecting' | 'disconnected'

export function subscribeConnection(handler: (state: ConnState) => void): () => void {
  const s = getSocket()
  const emit = () => {
    if (s.connected) handler('connected')
    else if (s.active) handler('connecting')
    else handler('disconnected')
  }
  const onConnect = () => handler('connected')
  const onDisconnect = () => handler('disconnected')
  const onAttempt = () => handler('connecting')
  s.on('connect', onConnect)
  s.on('disconnect', onDisconnect)
  s.on('reconnect_attempt', onAttempt)
  s.on('reconnect', onConnect)
  emit()
  return () => {
    s.off('connect', onConnect)
    s.off('disconnect', onDisconnect)
    s.off('reconnect_attempt', onAttempt)
    s.off('reconnect', onConnect)
  }
}

export function setRoomHandler(handler: RoomHandler | null) {
  onRoomHandler = handler
  getSocket()
}

export function setRoomClosedHandler(handler: RoomClosedHandler | null) {
  onRoomClosedHandler = handler
  getSocket()
}

export function setKickedHandler(handler: KickedHandler | null) {
  onKickedHandler = handler
  getSocket()
}

function apiUrl(path: string) {
  return `${API_BASE}${path}`
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), init)
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(res.ok ? 'Invalid API response' : `API error ${res.status}`)
  }
}

export async function ensureSessionBound(
  retries = 4,
): Promise<{ ok: boolean; playerId?: string; room?: PublicRoom; error?: string } | null> {
  const session = loadSession()
  if (!session) return null
  if (isSessionBound()) {
    return { ok: true, playerId: session.playerId }
  }
  if (rejoinInFlight) return rejoinInFlight

  rejoinInFlight = (async () => {
    let last: { ok: boolean; playerId?: string; room?: PublicRoom; error?: string } = {
      ok: false,
      error: 'rejoin failed',
    }
    for (let i = 0; i < retries; i++) {
      last = await rejoinGame(session.code, session.playerId)
      if (last.ok && last.room) {
        markSessionBound(session.code, session.playerId)
        onRoomHandler?.(normalizePublicRoom(last.room))
        return last
      }
      const err = last.error ?? ''
      if (err.includes('finns inte') || err.includes('hittades inte')) break
      await new Promise((r) => setTimeout(r, 700 * (i + 1)))
    }
    return last
  })()

  try {
    return await rejoinInFlight
  } finally {
    rejoinInFlight = null
  }
}

type OkRoom = { ok: true; playerId: string; room: PublicRoom }
type Err = { ok: false; error: string }

async function ack<T>(event: string, payload?: unknown): Promise<T> {
  const s = getSocket()
  if (!s.connected) {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Kunde inte ansluta till servern')), 12_000)
      s.once('connect', () => {
        clearTimeout(t)
        resolve()
      })
    })
  }

  const session = loadSession()
  const raw =
    payload && typeof payload === 'object' ? { ...(payload as Record<string, unknown>) } : {}
  const isIdentityEvent = event === 'create' || event === 'join' || event === 'rejoin'
  const body = isIdentityEvent
    ? raw
    : {
        ...raw,
        playerId: raw.playerId ?? session?.playerId,
        roomCode: raw.roomCode ?? session?.code,
      }

  if (event !== 'create' && event !== 'join' && event !== 'rejoin' && event !== 'setMaxRounds') {
    await ensureSessionBound(2)
  }

  return new Promise((resolve, reject) => {
    s.timeout(12000).emit(event, body, (err: Error | null, res: T) => {
      if (err) reject(err)
      else {
        if (
          isIdentityEvent &&
          res &&
          typeof res === 'object' &&
          'ok' in res &&
          (res as { ok: boolean }).ok &&
          'playerId' in res &&
          'room' in res
        ) {
          const ok = res as OkRoom
          markSessionBound(ok.room.code, ok.playerId)
        }
        resolve(res)
      }
    })
  })
}

export async function createGame(name: string) {
  return ack<OkRoom | Err>('create', { name })
}

export async function joinGame(code: string, name: string) {
  return ack<OkRoom | Err>('join', { code, name })
}

export async function rejoinGame(code: string, playerId: string) {
  return ack<OkRoom | Err>('rejoin', { code, playerId })
}

export async function setMaxRounds(maxRounds: number) {
  return ack<{ ok: boolean; error?: string; room?: PublicRoom }>('setMaxRounds', { maxRounds })
}

export async function startGame() {
  return ack<{ ok: boolean; error?: string; room?: PublicRoom }>('startGame', {})
}

export async function endChallenge() {
  return ack<{ ok: boolean; error?: string; room?: PublicRoom }>('endChallenge', {})
}

export async function submitResponse(payload: string) {
  return ack<{ ok: boolean; error?: string; room?: PublicRoom }>('submitResponse', { payload })
}

export async function scorePlayer(targetId: string, points: number) {
  return ack<{ ok: boolean; error?: string; room?: PublicRoom }>('scorePlayer', {
    targetId,
    points,
  })
}

export async function nextRound() {
  return ack<{ ok: boolean; error?: string; room?: PublicRoom }>('nextRound', {})
}

export async function backToLobby() {
  return ack<{ ok: boolean; error?: string; room?: PublicRoom }>('backToLobby', {})
}

export async function closeLobby() {
  return ack<{ ok: boolean; closed?: boolean; error?: string }>('closeLobby', {})
}

export async function removePlayer(targetId: string) {
  return ack<{ ok: boolean; error?: string; room?: PublicRoom }>('removePlayer', { targetId })
}

export async function endGame() {
  return ack<{ ok: boolean; error?: string; room?: PublicRoom }>('endGame', {})
}

export type HealthInfo = {
  ok: boolean
  rooms?: number
  persist?: {
    configured: boolean
    backend: string | null
    hint?: string | null
  }
}

export async function fetchHealth(): Promise<HealthInfo> {
  return apiJson<HealthInfo>('/api/health')
}

export type RoomPreview = {
  code: string
  status: string
  playerCount: number
  hostName: string
}

export async function fetchRoomPreview(code: string): Promise<RoomPreview> {
  const path = `/api/room/${encodeURIComponent(code.trim().toUpperCase())}/preview`
  const res = await fetch(apiUrl(path), { signal: AbortSignal.timeout(8_000) })
  const data = (await res.json().catch(() => ({}))) as RoomPreview & { error?: string }
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`)
  return data
}

const SESSION_KEY = 'yourtaskis-session'

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  boundSessionKey = null
}

export function joinUrl(code: string) {
  const base = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin
  return `${base.replace(/\/$/, '')}/?join=${encodeURIComponent(code)}`
}

export function tvUrl(code?: string) {
  const base = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin
  const url = `${base.replace(/\/$/, '')}/tv`
  return code ? `${url}?code=${encodeURIComponent(code)}` : url
}
