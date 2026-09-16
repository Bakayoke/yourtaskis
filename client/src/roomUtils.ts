import type { PublicRoom } from './types'

export const DEFAULT_MAX_ROUNDS = 5

export function normalizeMaxRounds(value: unknown): number {
  let n = value
  if (typeof n === 'string' && n.trim() !== '') n = Number(n)
  if (typeof n === 'number' && Number.isFinite(n) && n >= 0) return Math.round(n)
  return DEFAULT_MAX_ROUNDS
}

const emptyVoteCounts = {
  speed: 0,
  creative: 0,
  subjective: 0,
  endurance: 0,
  surprise: 0,
} as const

export function normalizePublicRoom(room: PublicRoom): PublicRoom {
  return {
    ...room,
    maxRounds: normalizeMaxRounds(room.maxRounds),
    youPendingRound: room.youPendingRound ?? false,
    players: room.players.map((p) => ({
      ...p,
      pendingRound: p.pendingRound ?? false,
    })),
    reactions: room.reactions ?? {},
    typeVoteCounts: room.typeVoteCounts ?? { ...emptyVoteCounts },
    yourTypeVote: room.yourTypeVote ?? null,
    comeback: room.comeback ?? null,
    handicap: room.handicap ?? null,
    awards: room.awards ?? null,
  }
}
