import type { PublicRoom } from './types'

export const DEFAULT_MAX_ROUNDS = 5

export function normalizeMaxRounds(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.round(value)
  return DEFAULT_MAX_ROUNDS
}

export function normalizePublicRoom(room: PublicRoom): PublicRoom {
  return { ...room, maxRounds: normalizeMaxRounds(room.maxRounds) }
}
