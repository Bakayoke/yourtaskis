import { customAlphabet } from 'nanoid'
import {
  getChallenge,
  pickNextChallenge,
  submissionModeFor,
} from './challenges.js'
import { deleteRoomRecord, loadRoomRecord, saveRoomRecord } from './persist.js'
import type { PublicChallenge, PublicRoom, Room, Submission } from './types.js'

const makeCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ', 4)
const makeId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)

export const MIN_PARTICIPANTS = 2
export const DEFAULT_MAX_ROUNDS = 5
const DISCONNECT_GRACE_MS = 60_000
const HOST_TRANSFER_AFTER_MS = 90_000
const ROOM_IDLE_MS = 12 * 60 * 60 * 1000

const rooms = new Map<string, Room>()
const socketToPlayer = new Map<string, { code: string; playerId: string }>()
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()

let onPersist: (() => void) | null = null
let onBroadcast: ((code: string) => void) | null = null

export function setPersistHook(fn: (() => void) | null) {
  onPersist = fn
}

export function setBroadcastHook(fn: ((code: string) => void) | null) {
  onBroadcast = fn
}

function touch(room?: Room) {
  if (room) {
    room.updatedAt = Date.now()
    void saveRoomRecord(room)
  }
  onPersist?.()
}

function playerKey(code: string, playerId: string) {
  return `${code}:${playerId}`
}

function cancelDisconnectTimer(code: string, playerId: string) {
  const key = playerKey(code, playerId)
  const t = disconnectTimers.get(key)
  if (t) {
    clearTimeout(t)
    disconnectTimers.delete(key)
  }
}

function uniqueCode(): string {
  let code = makeCode()
  while (rooms.has(code)) code = makeCode()
  return code
}

function hostOf(room: Room) {
  return room.players.find((p) => p.id === room.hostId)
}

function participants(room: Room) {
  return room.players.filter((p) => p.id !== room.hostId)
}

function participantCount(room: Room) {
  return participants(room).length
}

function normalizeRoom(room: Room) {
  if (room.maxRounds == null || room.maxRounds < 0) room.maxRounds = DEFAULT_MAX_ROUNDS
}

function roundsComplete(room: Room) {
  return room.maxRounds > 0 && room.roundIndex >= room.maxRounds
}

function challengeForRoom(room: Room): PublicChallenge | null {
  if (!room.currentChallengeId) return null
  const c = getChallenge(room.currentChallengeId)
  if (!c) return null
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    type: c.type,
    timeLimitSeconds: c.timeLimitSeconds ?? null,
    submissionMode: submissionModeFor(c),
  }
}

function hasSubmitted(room: Room, playerId: string) {
  return room.submissions.some((s) => s.playerId === playerId)
}

function allParticipantsSubmitted(room: Room) {
  const parts = participants(room)
  if (parts.length === 0) return false
  return parts.every((p) => hasSubmitted(room, p.id))
}

function beginChallenge(room: Room, challengeId: string) {
  const challenge = getChallenge(challengeId)
  if (!challenge) return
  room.currentChallengeId = challengeId
  if (!room.usedChallengeIds.includes(challengeId)) {
    room.usedChallengeIds.push(challengeId)
  }
  room.submissions = []
  room.roundScores = {}
  room.status = 'challenge'
  room.phaseEndsAt =
    challenge.timeLimitSeconds != null
      ? Date.now() + challenge.timeLimitSeconds * 1000
      : 0
}

function moveToJudging(room: Room) {
  room.status = 'judging'
  room.phaseEndsAt = 0
  room.roundScores = {}
}

function isHost(room: Room, playerId: string) {
  return room.hostId === playerId
}

function finishGame(room: Room) {
  room.status = 'finished'
  room.phaseEndsAt = 0
}

function moveToScores(room: Room) {
  for (const [playerId, points] of Object.entries(room.roundScores)) {
    const player = room.players.find((p) => p.id === playerId)
    if (player) player.score += points
  }
  if (roundsComplete(room)) {
    finishGame(room)
  } else {
    room.status = 'scores'
    room.phaseEndsAt = 0
  }
}

export function allRooms() {
  return rooms.values()
}

export function getRoom(code: string) {
  const room = rooms.get(code.toUpperCase())
  if (room) normalizeRoom(room)
  return room
}

export function getBinding(socketId: string) {
  return socketToPlayer.get(socketId) ?? null
}

export async function hydrateRoom(code: string) {
  const c = code.toUpperCase().trim()
  if (!c || rooms.has(c)) return
  const loaded = await loadRoomRecord(c)
  if (loaded) {
    normalizeRoom(loaded)
    rooms.set(c, loaded)
  }
}

export async function reloadRoomFromStore(code: string) {
  const c = code.toUpperCase().trim()
  const loaded = await loadRoomRecord(c)
  if (loaded) {
    normalizeRoom(loaded)
    rooms.set(c, loaded)
    return loaded
  }
  return null
}

export function restoreRooms(restored: Room[]) {
  for (const room of restored) {
    normalizeRoom(room)
    rooms.set(room.code, room)
  }
}

export function createRoom(hostName: string, socketId: string) {
  const code = uniqueCode()
  const hostId = makeId()
  const room: Room = {
    code,
    hostId,
    players: [{ id: hostId, name: hostName.trim() || 'Testledare', connected: true, score: 0 }],
    status: 'lobby',
    roundIndex: 0,
    maxRounds: DEFAULT_MAX_ROUNDS,
    currentChallengeId: null,
    phaseEndsAt: 0,
    submissions: [],
    roundScores: {},
    usedChallengeIds: [],
    updatedAt: Date.now(),
  }
  rooms.set(code, room)
  socketToPlayer.set(socketId, { code, playerId: hostId })
  touch(room)
  return { room, playerId: hostId }
}

export function joinRoom(code: string, name: string, socketId: string) {
  const room = getRoom(code)
  if (!room) return { error: 'Hittade inget spel med den koden' as const }
  if (room.status !== 'lobby') {
    return { error: 'Spelet har redan startat — vänta till nästa omgång' as const }
  }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Ange ett namn' as const }

  const existing = room.players.find(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase() && p.connected,
  )
  if (existing) return { error: 'Namnet är redan taget' as const }

  const playerId = makeId()
  room.players.push({ id: playerId, name: trimmed, connected: true, score: 0 })
  socketToPlayer.set(socketId, { code: room.code, playerId })
  touch(room)
  return { room, playerId }
}

export function reconnectSocket(code: string, playerId: string, socketId: string) {
  const room = getRoom(code)
  if (!room) return { error: 'Rummet finns inte' as const }
  const player = room.players.find((p) => p.id === playerId)
  if (!player) return { error: 'Spelaren hittades inte' as const }

  cancelDisconnectTimer(room.code, playerId)
  player.connected = true
  socketToPlayer.set(socketId, { code: room.code, playerId })
  touch(room)
  return room
}

export function handleDisconnect(socketId: string) {
  const binding = socketToPlayer.get(socketId)
  socketToPlayer.delete(socketId)
  if (!binding) return

  const room = getRoom(binding.code)
  if (!room) return

  const player = room.players.find((p) => p.id === binding.playerId)
  if (!player) return

  player.connected = false
  touch(room)

  const key = playerKey(room.code, player.id)
  const t = setTimeout(() => {
    disconnectTimers.delete(key)
    const r = getRoom(room.code)
    if (!r) return
    const p = r.players.find((x) => x.id === player.id)
    if (!p || p.connected) return

    if (p.id === r.hostId) {
      const next = r.players.find((x) => x.id !== r.hostId && x.connected)
      if (next) {
        r.hostId = next.id
      }
    }

    r.players = r.players.filter((x) => x.id !== player.id || x.connected)
    if (r.players.length === 0) {
      rooms.delete(r.code)
      void deleteRoomRecord(r.code)
    }
    touch(r)
    onBroadcast?.(r.code)
  }, player.id === room.hostId ? HOST_TRANSFER_AFTER_MS : DISCONNECT_GRACE_MS)

  disconnectTimers.set(key, t)
}

export function previewRoom(code: string) {
  const room = getRoom(code)
  if (!room) return null
  const host = hostOf(room)
  return {
    code: room.code,
    status: room.status,
    playerCount: room.players.length,
    hostName: host?.name ?? 'Testledare',
  }
}

export function setMaxRounds(code: string, playerId: string, maxRounds: number) {
  const room = getRoom(code)
  if (!room) return { error: 'Rummet finns inte' as const }
  if (!isHost(room, playerId)) return { error: 'Bara testledaren kan välja antal test' as const }
  if (room.status !== 'lobby') return { error: 'Kan bara ändras i lobbyn' as const }

  const n = Math.round(maxRounds)
  if (n < 0 || n > 99) return { error: 'Ogiltigt antal rundor' as const }
  room.maxRounds = n
  touch(room)
  return room
}

export function startGame(code: string, playerId: string) {
  const room = getRoom(code)
  if (!room) return { error: 'Rummet finns inte' as const }
  if (!isHost(room, playerId)) return { error: 'Bara testledaren kan starta' as const }
  if (room.status !== 'lobby') return { error: 'Spelet har redan startat' as const }
  if (participantCount(room) < MIN_PARTICIPANTS) {
    return {
      error: `Minst ${MIN_PARTICIPANTS} deltagare krävs (förutom testledaren)`,
    } as const
  }

  room.roundIndex = 1
  const next = pickNextChallenge(room.usedChallengeIds)
  beginChallenge(room, next.id)
  touch(room)
  return room
}

export function endChallenge(code: string, playerId: string) {
  const room = getRoom(code)
  if (!room) return { error: 'Rummet finns inte' as const }
  if (!isHost(room, playerId)) return { error: 'Bara testledaren kan avsluta testet' as const }
  if (room.status !== 'challenge') return { error: 'Inget aktivt test' as const }

  moveToJudging(room)
  touch(room)
  return room
}

export function submitResponse(code: string, playerId: string, payload: string) {
  const room = getRoom(code)
  if (!room) return { error: 'Rummet finns inte' as const }
  if (isHost(room, playerId)) return { error: 'Testledaren deltar inte i testet' as const }
  if (room.status !== 'challenge') return { error: 'Inget aktivt test' as const }

  const challenge = room.currentChallengeId ? getChallenge(room.currentChallengeId) : null
  if (!challenge) return { error: 'Inget test aktivt' as const }

  const mode = submissionModeFor(challenge)
  const trimmed = payload.trim()
  if (mode === 'physical') {
    if (trimmed !== 'ready') return { error: 'Ogiltig inlämning' as const }
  } else if (!trimmed) {
    return { error: 'Inlämningen är tom' as const }
  }

  if (hasSubmitted(room, playerId)) return { error: 'Du har redan lämnat in' as const }

  const submission: Submission = {
    playerId,
    payload: mode === 'physical' ? 'ready' : trimmed,
    submittedAt: Date.now(),
  }
  room.submissions.push(submission)

  if (allParticipantsSubmitted(room)) {
    moveToJudging(room)
  }

  touch(room)
  return room
}

export function scorePlayer(code: string, playerId: string, targetId: string, points: number) {
  const room = getRoom(code)
  if (!room) return { error: 'Rummet finns inte' as const }
  if (!isHost(room, playerId)) return { error: 'Bara testledaren kan ge poäng' as const }
  if (room.status !== 'judging') return { error: 'Inte i bedömningsfas' as const }
  if (targetId === room.hostId) return { error: 'Testledaren får inga poäng' as const }

  const target = room.players.find((p) => p.id === targetId)
  if (!target) return { error: 'Deltagaren hittades inte' as const }

  const pts = Math.max(1, Math.min(5, Math.round(points)))
  room.roundScores[targetId] = pts

  const parts = participants(room)
  const allScored = parts.every((p) => room.roundScores[p.id] != null)
  if (allScored) {
    moveToScores(room)
  }

  touch(room)
  return room
}

export function nextRound(code: string, playerId: string) {
  const room = getRoom(code)
  if (!room) return { error: 'Rummet finns inte' as const }
  if (!isHost(room, playerId)) return { error: 'Bara testledaren kan fortsätta' as const }
  if (room.status !== 'scores') return { error: 'Avsluta omgången först' as const }
  if (roundsComplete(room)) return { error: 'Alla rundor är klara' as const }

  room.roundIndex += 1
  const next = pickNextChallenge(room.usedChallengeIds)
  beginChallenge(room, next.id)
  touch(room)
  return room
}

export function backToLobby(code: string, playerId: string) {
  const room = getRoom(code)
  if (!room) return { error: 'Rummet finns inte' as const }
  if (!isHost(room, playerId)) return { error: 'Bara testledaren kan gå till lobbyn' as const }

  room.status = 'lobby'
  room.currentChallengeId = null
  room.phaseEndsAt = 0
  room.submissions = []
  room.roundScores = {}
  room.roundIndex = 0
  room.usedChallengeIds = []
  touch(room)
  return room
}

export function endGame(code: string, playerId: string) {
  const room = getRoom(code)
  if (!room) return { error: 'Rummet finns inte' as const }
  if (!isHost(room, playerId)) return { error: 'Bara testledaren kan avsluta' as const }

  finishGame(room)
  touch(room)
  return room
}

export function onPhaseTimeout(room: Room) {
  if (room.status !== 'challenge') return false
  if (room.phaseEndsAt <= 0 || Date.now() < room.phaseEndsAt) return false
  moveToJudging(room)
  touch(room)
  return true
}

export function roomsNeedingTick() {
  const out: Room[] = []
  for (const room of rooms.values()) {
    if (room.status === 'challenge' && room.phaseEndsAt > 0 && Date.now() >= room.phaseEndsAt) {
      out.push(room)
    }
  }
  return out
}

export function pruneIdleRooms() {
  const now = Date.now()
  for (const [code, room] of rooms) {
    if (now - room.updatedAt > ROOM_IDLE_MS) {
      rooms.delete(code)
      void deleteRoomRecord(code)
    }
  }
}

export function toPublicRoom(room: Room, viewerId: string): PublicRoom {
  normalizeRoom(room)
  const host = hostOf(room)
  const youAreHost = viewerId === room.hostId
  const parts = participants(room)

  let submissions = room.submissions.map((s) => ({
    playerId: s.playerId,
    playerName: room.players.find((p) => p.id === s.playerId)?.name ?? '?',
    payload: s.payload,
    submittedAt: s.submittedAt,
  }))

  if (!youAreHost && room.status === 'challenge') {
    submissions = submissions.filter((s) => s.playerId === viewerId)
  } else if (!youAreHost && room.status === 'judging') {
    submissions = submissions.filter((s) => s.playerId === viewerId)
  }

  const roundScores =
    room.status === 'scores' || room.status === 'finished'
      ? parts.map((p) => ({
          playerId: p.id,
          name: p.name,
          points: room.roundScores[p.id] ?? 0,
        }))
      : null

  const scores = [...room.players]
    .filter((p) => p.id !== room.hostId)
    .sort((a, b) => b.score - a.score)
    .map((p) => ({ playerId: p.id, name: p.name, score: p.score }))

  return {
    code: room.code,
    hostId: room.hostId,
    hostName: host?.name ?? 'Testledare',
    players: room.players,
    status: room.status,
    roundIndex: room.roundIndex,
    maxRounds: room.maxRounds,
    challenge: challengeForRoom(room),
    phaseEndsAt: room.phaseEndsAt,
    submissions,
    youSubmitted: hasSubmitted(room, viewerId),
    submittedCount: room.submissions.length,
    participantCount: parts.length,
    roundScores,
    scores,
    youAreHost,
    minParticipants: MIN_PARTICIPANTS,
  }
}
