import { customAlphabet } from 'nanoid'
import { computeSessionAwards } from './awards.js'
import {
  getChallenge,
  pickNextChallenge,
  submissionModeFor,
  defaultTimer,
} from './challenges.js'
import type { Challenge } from './challengeTypes.js'
import { normalizeDeckId, type DeckId } from './decks.js'
import type { ChallengeType } from './challengeTypes.js'
import { pickHandicapText } from './handicaps.js'
import { deleteRoomRecord, loadRoomRecord, saveRoomRecord } from './persist.js'
import type {
  CustomChallengeInput,
  JudgingMode,
  PublicChallenge,
  PublicRoom,
  ReactionEmoji,
  Room,
  Submission,
  TypeVote,
} from './types.js'

const makeCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ', 4)
const makeId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)

export const MIN_PARTICIPANTS = 2
export const DEFAULT_MAX_ROUNDS = 5
/** Lobby / after game — long enough to grab a snack and reopen the browser. */
const DISCONNECT_GRACE_MS = 20 * 60 * 1000
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

function activeParticipants(room: Room) {
  return participants(room).filter((p) => !p.pendingRound)
}

function participantCount(room: Room) {
  return activeParticipants(room).length
}

function activatePendingPlayers(room: Room) {
  for (const p of room.players) {
    if (p.pendingRound) p.pendingRound = false
  }
}

function emptyRoomMeta(): Pick<
  Room,
  | 'reactionLog'
  | 'typeVotes'
  | 'roundHistory'
  | 'fiveStarCounts'
  | 'comeback'
  | 'handicap'
  | 'sessionAwards'
> {
  return {
    reactionLog: [],
    typeVotes: {},
    roundHistory: [],
    fiveStarCounts: {},
    comeback: null,
    handicap: null,
    sessionAwards: null,
  }
}

function normalizeRoom(room: Room) {
  if (room.maxRounds == null || room.maxRounds < 0) room.maxRounds = DEFAULT_MAX_ROUNDS
  if (!room.reactionLog) room.reactionLog = []
  if (!room.typeVotes) room.typeVotes = {}
  if (!room.roundHistory) room.roundHistory = []
  if (!room.fiveStarCounts) room.fiveStarCounts = {}
  if (room.comeback === undefined) room.comeback = null
  if (room.handicap === undefined) room.handicap = null
  if (room.sessionAwards === undefined) room.sessionAwards = null
  if (!room.deckId) room.deckId = 'classic'
  else room.deckId = normalizeDeckId(room.deckId)
  if (room.upcomingChallengeId === undefined) room.upcomingChallengeId = null
  if (!room.judgingMode) room.judgingMode = 'host'
  if (!room.crowdVotes) room.crowdVotes = {}
  if (!room.customChallenges) room.customChallenges = {}
}

function resolveChallenge(room: Room, id: string): Challenge | undefined {
  return room.customChallenges[id] ?? getChallenge(id)
}

function pickOptions(room: Room) {
  return {
    preferredType: winningVoteType(room),
    deckId: room.deckId,
  }
}

function refreshUpcomingChallenge(room: Room) {
  if (room.status !== 'scores' || roundsComplete(room)) {
    room.upcomingChallengeId = null
    return
  }
  const next = pickNextChallenge(room.usedChallengeIds, pickOptions(room))
  room.upcomingChallengeId = next.id
}

function judgingModeForRound(roundIndex: number): JudgingMode {
  return roundIndex > 0 && roundIndex % 3 === 0 ? 'crowd' : 'host'
}

function crowdScoresFromVotes(room: Room): Record<string, number> {
  const active = activeParticipants(room)
  const counts: Record<string, number> = {}
  for (const p of active) counts[p.id] = 0
  for (const targetId of Object.values(room.crowdVotes)) {
    if (counts[targetId] != null) counts[targetId]! += 1
  }
  const maxVotes = Math.max(0, ...Object.values(counts))
  const scores: Record<string, number> = {}
  if (maxVotes === 0) {
    for (const p of active) scores[p.id] = 2
    return scores
  }
  const sorted = [...active].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))
  const ladder = [5, 4, 3, 2, 1]
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]!
    const prev = i > 0 ? sorted[i - 1]! : null
    if (prev && (counts[prev.id] ?? 0) === (counts[p.id] ?? 0)) {
      scores[p.id] = scores[prev.id]!
    } else {
      scores[p.id] = ladder[Math.min(i, ladder.length - 1)] ?? 1
    }
  }
  return scores
}

function tryFinishCrowdVoting(room: Room) {
  const voters = activeParticipants(room)
  const allVoted = voters.every((p) => room.crowdVotes[p.id] != null)
  if (!allVoted) return false
  room.roundScores = crowdScoresFromVotes(room)
  moveToScores(room)
  return true
}

function aggregateReactions(room: Room) {
  const out: Record<string, Partial<Record<ReactionEmoji, number>>> = {}
  for (const r of room.reactionLog) {
    if (!out[r.to]) out[r.to] = {}
    const bucket = out[r.to]!
    bucket[r.emoji] = (bucket[r.emoji] ?? 0) + 1
  }
  return out
}

function tallyTypeVotes(room: Room): Record<TypeVote, number> {
  const counts: Record<TypeVote, number> = {
    speed: 0,
    creative: 0,
    subjective: 0,
    endurance: 0,
    surprise: 0,
  }
  for (const vote of Object.values(room.typeVotes)) counts[vote] += 1
  return counts
}

function winningVoteType(room: Room): ChallengeType | null {
  const counts = tallyTypeVotes(room)
  let best: ChallengeType | null = null
  let bestN = 0
  for (const type of ['speed', 'creative', 'subjective', 'endurance'] as const) {
    if (counts[type] > bestN) {
      bestN = counts[type]
      best = type
    }
  }
  if (counts.surprise >= bestN && counts.surprise > 0) return null
  return bestN > 0 ? best : null
}

function recordRoundHistory(room: Room) {
  const challenge = room.currentChallengeId ? resolveChallenge(room, room.currentChallengeId) : null
  if (!challenge) return
  for (const [playerId, points] of Object.entries(room.roundScores)) {
    if (points === 5) {
      room.fiveStarCounts[playerId] = (room.fiveStarCounts[playerId] ?? 0) + 1
    }
  }
  room.roundHistory.push({
    roundIndex: room.roundIndex,
    challengeTitle: challenge.title,
    challengeType: challenge.type,
    submissionMode: submissionModeFor(challenge),
    pointsByPlayer: { ...room.roundScores },
  })
}

function detectComeback(room: Room) {
  const active = activeParticipants(room)
  if (active.length < 2) {
    room.comeback = null
    return
  }
  const before = active.map((p) => ({
    id: p.id,
    score: p.score - (room.roundScores[p.id] ?? 0),
  }))
  const rankOf = (list: { id: string; score: number }[], id: string) =>
    [...list].sort((a, b) => b.score - a.score).findIndex((x) => x.id === id) + 1

  let bestId: string | null = null
  let bestJump = 0
  let fromRank = 0
  let toRank = 0

  for (const p of active) {
    const beforeRank = rankOf(before, p.id)
    const afterRank = rankOf(
      active.map((x) => ({ id: x.id, score: x.score })),
      p.id,
    )
    const jump = beforeRank - afterRank
    if (jump > bestJump) {
      bestJump = jump
      bestId = p.id
      fromRank = beforeRank
      toRank = afterRank
    }
  }

  if (bestId && bestJump >= 2) {
    const player = active.find((p) => p.id === bestId)!
    room.comeback = {
      playerId: bestId,
      playerName: player.name,
      fromRank,
      toRank,
    }
  } else {
    room.comeback = null
  }
}

function assignHandicapForLeader(room: Room) {
  const active = activeParticipants(room)
  if (active.length < 2) {
    room.handicap = null
    return
  }
  const leader = [...active].sort((a, b) => b.score - a.score)[0]!
  if (leader.score <= 0) {
    room.handicap = null
    return
  }
  room.handicap = {
    playerId: leader.id,
    playerName: leader.name,
    text: pickHandicapText(room.roundIndex),
  }
}

function resetRoundMeta(room: Room) {
  room.reactionLog = []
  room.typeVotes = {}
  room.comeback = null
}

function roundsComplete(room: Room) {
  return room.maxRounds > 0 && room.roundIndex >= room.maxRounds
}

function challengeForRoom(room: Room): PublicChallenge | null {
  if (!room.currentChallengeId) return null
  const c = resolveChallenge(room, room.currentChallengeId)
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
  const parts = activeParticipants(room)
  if (parts.length === 0) return false
  return parts.every((p) => hasSubmitted(room, p.id))
}

function beginChallenge(room: Room, challengeId: string) {
  const challenge = resolveChallenge(room, challengeId)
  if (!challenge) return
  room.currentChallengeId = challengeId
  if (!room.usedChallengeIds.includes(challengeId)) {
    room.usedChallengeIds.push(challengeId)
  }
  room.submissions = []
  room.roundScores = {}
  room.crowdVotes = {}
  room.judgingMode = judgingModeForRound(room.roundIndex)
  resetRoundMeta(room)
  room.status = 'challenge'
  room.upcomingChallengeId = null
  room.phaseEndsAt =
    challenge.timeLimitSeconds != null
      ? Date.now() + challenge.timeLimitSeconds * 1000
      : 0
}

function moveToJudging(room: Room) {
  room.status = 'judging'
  room.phaseEndsAt = 0
  room.roundScores = {}
  room.crowdVotes = {}
}

function isHost(room: Room, playerId: string) {
  return room.hostId === playerId
}

function finishGame(room: Room) {
  room.status = 'finished'
  room.phaseEndsAt = 0
  room.handicap = null
  room.sessionAwards = computeSessionAwards(room)
}

function moveToScores(room: Room) {
  recordRoundHistory(room)
  for (const [playerId, points] of Object.entries(room.roundScores)) {
    const player = room.players.find((p) => p.id === playerId)
    if (player) player.score += points
  }
  detectComeback(room)
  if (roundsComplete(room)) {
    finishGame(room)
  } else {
    room.status = 'scores'
    room.phaseEndsAt = 0
    refreshUpcomingChallenge(room)
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
    ...emptyRoomMeta(),
    deckId: 'classic',
    upcomingChallengeId: null,
    judgingMode: 'host',
    crowdVotes: {},
    customChallenges: {},
  }
  rooms.set(code, room)
  socketToPlayer.set(socketId, { code, playerId: hostId })
  touch(room)
  return { room, playerId: hostId }
}

export function joinRoom(code: string, name: string, socketId: string) {
  const room = getRoom(code)
  if (!room) return { error: 'Hittade inget spel med den koden' as const }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Ange ett namn' as const }

  const existingConnected = room.players.find(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase() && p.connected,
  )
  if (existingConnected) return { error: 'Namnet är redan taget' as const }

  const reclaim = room.players.find(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase() && !p.connected,
  )
  if (reclaim) {
    cancelDisconnectTimer(room.code, reclaim.id)
    reclaim.connected = true
    socketToPlayer.set(socketId, { code: room.code, playerId: reclaim.id })
    touch(room)
    return { room, playerId: reclaim.id }
  }

  const joiningMidGame = room.status !== 'lobby'
  const playerId = makeId()
  room.players.push({
    id: playerId,
    name: trimmed,
    connected: true,
    score: 0,
    pendingRound: joiningMidGame,
  })
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

    // Keep roster intact while a game is running — phone sleep shouldn't drop players.
    if (r.status !== 'lobby' && r.status !== 'finished') return

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
  activatePendingPlayers(room)
  const next = pickNextChallenge(room.usedChallengeIds, { deckId: room.deckId })
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

  const player = room.players.find((p) => p.id === playerId)
  if (player?.pendingRound) return { error: 'Du går med från nästa test' as const }

  const challenge = room.currentChallengeId ? resolveChallenge(room, room.currentChallengeId) : null
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
  if (room.judgingMode === 'crowd') {
    return { error: 'Gruppen röstar den här rundan — testledaren ger inga poäng' as const }
  }
  if (targetId === room.hostId) return { error: 'Testledaren får inga poäng' as const }

  const target = room.players.find((p) => p.id === targetId)
  if (!target) return { error: 'Deltagaren hittades inte' as const }
  if (target.pendingRound) return { error: 'Deltagaren går med nästa runda' as const }

  const pts = Math.max(1, Math.min(5, Math.round(points)))
  room.roundScores[targetId] = pts

  const parts = activeParticipants(room)
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
  activatePendingPlayers(room)
  assignHandicapForLeader(room)
  const upcoming = room.upcomingChallengeId
  const nextId =
    upcoming && resolveChallenge(room, upcoming)
      ? upcoming
      : pickNextChallenge(room.usedChallengeIds, pickOptions(room)).id
  beginChallenge(room, nextId)
  touch(room)
  return room
}

export function addReaction(
  code: string,
  playerId: string,
  targetId: string,
  emoji: ReactionEmoji,
) {
  const room = getRoom(code)
  if (!room) return { error: 'Rummet finns inte' as const }
  if (room.status !== 'judging' && room.status !== 'scores' && room.status !== 'finished') {
    return { error: 'Reaktioner är inte tillgängliga nu' as const }
  }
  if (targetId === room.hostId) return { error: 'Ogiltigt mål' as const }
  if (!room.players.some((p) => p.id === targetId)) return { error: 'Deltagaren hittades inte' as const }
  if (playerId === room.hostId) return { error: 'Testledaren reagerar inte' as const }
  if (!(['laugh', 'fire', 'skull'] as const).includes(emoji)) {
    return { error: 'Ogiltig reaktion' as const }
  }

  const existing = room.reactionLog.findIndex((r) => r.from === playerId && r.to === targetId)
  if (existing >= 0) {
    room.reactionLog[existing]!.emoji = emoji
  } else {
    room.reactionLog.push({ from: playerId, to: targetId, emoji })
  }
  touch(room)
  return room
}

export function voteNextType(code: string, playerId: string, vote: TypeVote) {
  const room = getRoom(code)
  if (!room) return { error: 'Rummet finns inte' as const }
  if (room.status !== 'scores') return { error: 'Rösta mellan rundor' as const }
  if (isHost(room, playerId)) return { error: 'Testledaren startar nästa test' as const }

  const player = room.players.find((p) => p.id === playerId)
  if (player?.pendingRound) return { error: 'Du går med från nästa test' as const }

  const allowed: TypeVote[] = ['speed', 'creative', 'subjective', 'endurance', 'surprise']
  if (!allowed.includes(vote)) return { error: 'Ogiltig röst' as const }

  room.typeVotes[playerId] = vote
  if (room.status === 'scores' && !roundsComplete(room)) {
    refreshUpcomingChallenge(room)
  }
  touch(room)
  return room
}

export function setDeck(code: string, playerId: string, deckId: string) {
  const room = getRoom(code)
  if (!room) return { error: 'Rummet finns inte' as const }
  if (!isHost(room, playerId)) return { error: 'Bara testledaren kan välja spellista' as const }
  if (room.status !== 'lobby') return { error: 'Kan bara ändras i lobbyn' as const }
  room.deckId = normalizeDeckId(deckId)
  touch(room)
  return room
}

export function skipUpcomingChallenge(code: string, playerId: string) {
  const room = getRoom(code)
  if (!room) return { error: 'Rummet finns inte' as const }
  if (!isHost(room, playerId)) return { error: 'Bara testledaren kan hoppa över' as const }
  if (room.status !== 'scores') return { error: 'Kan bara byta nästa test mellan rundor' as const }
  if (roundsComplete(room)) return { error: 'Inga fler rundor' as const }
  const skipId = room.upcomingChallengeId
  if (skipId && !room.usedChallengeIds.includes(skipId)) {
    room.usedChallengeIds.push(skipId)
  }
  refreshUpcomingChallenge(room)
  touch(room)
  return room
}

export function queueCustomChallenge(code: string, playerId: string, input: CustomChallengeInput) {
  const room = getRoom(code)
  if (!room) return { error: 'Rummet finns inte' as const }
  if (!isHost(room, playerId)) return { error: 'Bara testledaren kan lägga till eget test' as const }
  if (room.status !== 'lobby' && room.status !== 'scores') {
    return { error: 'Eget test kan läggas till i lobbyn eller mellan rundor' as const }
  }
  if (roundsComplete(room)) return { error: 'Inga fler rundor' as const }

  const title = String(input.title ?? '').trim()
  const description = String(input.description ?? '').trim()
  if (!title || !description) return { error: 'Titel och instruktion krävs' as const }

  const type = input.type
  const allowed: Challenge['type'][] = ['speed', 'creative', 'subjective', 'endurance']
  if (!allowed.includes(type)) return { error: 'Ogiltig testtyp' as const }

  const mode =
    input.submissionMode ??
    (type === 'creative'
      ? 'draw'
      : type === 'subjective'
        ? 'text'
        : 'physical')
  const id = `custom-${makeId()}`
  const challenge: Challenge = {
    id,
    title: title.slice(0, 80),
    description: description.slice(0, 600),
    type,
    submissionMode: mode,
    timeLimitSeconds:
      input.timeLimitSeconds != null && input.timeLimitSeconds > 0
        ? Math.min(600, Math.round(input.timeLimitSeconds))
        : defaultTimer(type, mode),
  }
  room.customChallenges[id] = challenge
  room.upcomingChallengeId = id
  touch(room)
  return room
}

export function crowdVote(code: string, playerId: string, targetId: string) {
  const room = getRoom(code)
  if (!room) return { error: 'Rummet finns inte' as const }
  if (room.status !== 'judging') return { error: 'Rösta efter testet' as const }
  if (room.judgingMode !== 'crowd') return { error: 'Testledaren bedömer den här rundan' as const }
  if (isHost(room, playerId)) return { error: 'Testledaren röstar inte' as const }
  const player = room.players.find((p) => p.id === playerId)
  if (player?.pendingRound) return { error: 'Du går med från nästa test' as const }
  if (targetId === playerId) return { error: 'Du kan inte rösta på dig själv' as const }
  if (targetId === room.hostId) return { error: 'Ogiltigt val' as const }
  if (!activeParticipants(room).some((p) => p.id === targetId)) {
    return { error: 'Deltagaren hittades inte' as const }
  }

  room.crowdVotes[playerId] = targetId
  tryFinishCrowdVoting(room)
  touch(room)
  return room
}

export function finishCrowdVoting(code: string, playerId: string) {
  const room = getRoom(code)
  if (!room) return { error: 'Rummet finns inte' as const }
  if (!isHost(room, playerId)) return { error: 'Bara testledaren kan avsluta röstningen' as const }
  if (room.status !== 'judging' || room.judgingMode !== 'crowd') {
    return { error: 'Ingen gruppröstning just nu' as const }
  }
  room.roundScores = crowdScoresFromVotes(room)
  moveToScores(room)
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
  room.roundHistory = []
  room.fiveStarCounts = {}
  room.sessionAwards = null
  room.handicap = null
  room.upcomingChallengeId = null
  room.crowdVotes = {}
  room.judgingMode = 'host'
  room.customChallenges = {}
  resetRoundMeta(room)
  for (const p of room.players) {
    p.pendingRound = false
    p.score = 0
  }
  touch(room)
  return room
}

export function removePlayer(code: string, hostId: string, targetId: string) {
  const room = getRoom(code)
  if (!room) return { error: 'Rummet finns inte' as const }
  if (!isHost(room, hostId)) return { error: 'Bara testledaren kan ta bort deltagare' as const }
  if (room.status !== 'lobby') return { error: 'Kan bara ta bort deltagare i lobbyn' as const }
  if (targetId === room.hostId) return { error: 'Kan inte ta bort testledaren' as const }

  const target = room.players.find((p) => p.id === targetId)
  if (!target) return { error: 'Deltagaren hittades inte' as const }

  cancelDisconnectTimer(code, targetId)
  const kickedSocketIds: string[] = []
  for (const [socketId, binding] of socketToPlayer.entries()) {
    if (binding.code === code && binding.playerId === targetId) {
      kickedSocketIds.push(socketId)
      socketToPlayer.delete(socketId)
    }
  }

  room.players = room.players.filter((p) => p.id !== targetId)
  touch(room)
  return { room, kickedSocketIds }
}

export function closeLobby(code: string, playerId: string) {
  const room = getRoom(code)
  if (!room) return { error: 'Rummet finns inte' as const }
  if (!isHost(room, playerId)) return { error: 'Bara testledaren kan avsluta lobbyn' as const }
  if (room.status !== 'lobby') {
    return { error: 'Kan bara avsluta lobbyn innan spelet startat' as const }
  }

  for (const player of room.players) {
    cancelDisconnectTimer(code, player.id)
  }

  for (const [socketId, binding] of socketToPlayer.entries()) {
    if (binding.code === code) socketToPlayer.delete(socketId)
  }

  rooms.delete(code)
  void deleteRoomRecord(code)
  onPersist?.()
  return { closed: true as const, code }
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
  const viewer = room.players.find((p) => p.id === viewerId)
  const parts = participants(room)
  const active = activeParticipants(room)

  let submissions = room.submissions.map((s) => ({
    playerId: s.playerId,
    playerName: room.players.find((p) => p.id === s.playerId)?.name ?? '?',
    payload: s.payload,
    submittedAt: s.submittedAt,
  }))

  if (!youAreHost && room.status === 'challenge') {
    submissions = submissions.filter((s) => s.playerId === viewerId)
  }

  const roundScores =
    room.status === 'scores' || room.status === 'finished'
      ? active.map((p) => ({
          playerId: p.id,
          name: p.name,
          points: room.roundScores[p.id] ?? 0,
        }))
      : null

  const scores = [...active]
    .sort((a, b) => b.score - a.score)
    .map((p) => ({ playerId: p.id, name: p.name, score: p.score }))

  return {
    code: room.code,
    hostId: room.hostId,
    hostName: host?.name ?? 'Testledare',
    players: room.players.map(({ id, name, connected, score, pendingRound }) => ({
      id,
      name,
      connected,
      score,
      pendingRound: pendingRound ?? false,
    })),
    status: room.status,
    roundIndex: room.roundIndex,
    maxRounds: room.maxRounds,
    challenge: challengeForRoom(room),
    phaseEndsAt: room.phaseEndsAt,
    submissions,
    youSubmitted: hasSubmitted(room, viewerId),
    submittedCount: room.submissions.length,
    participantCount: active.length,
    roundScores,
    scores,
    youAreHost,
    youPendingRound: Boolean(viewer?.pendingRound),
    minParticipants: MIN_PARTICIPANTS,
    reactions: aggregateReactions(room),
    typeVoteCounts: tallyTypeVotes(room),
    yourTypeVote: room.typeVotes[viewerId] ?? null,
    comeback: room.comeback,
    handicap: room.handicap,
    awards: room.sessionAwards,
    deckId: room.deckId,
    upcomingChallenge:
      room.upcomingChallengeId && resolveChallenge(room, room.upcomingChallengeId)
        ? challengeForRoomFromId(room, room.upcomingChallengeId)
        : null,
    judgingMode: room.judgingMode,
    crowdVoteCounts: tallyCrowdVotes(room),
    yourCrowdVote: room.crowdVotes[viewerId] ?? null,
    crowdVotesDone: Object.keys(room.crowdVotes).length,
  }
}

function challengeForRoomFromId(room: Room, id: string): PublicChallenge | null {
  const c = resolveChallenge(room, id)
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

function tallyCrowdVotes(room: Room) {
  const counts: Record<string, number> = {}
  for (const targetId of Object.values(room.crowdVotes)) {
    counts[targetId] = (counts[targetId] ?? 0) + 1
  }
  return counts
}
