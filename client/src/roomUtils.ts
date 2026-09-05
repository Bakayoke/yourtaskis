import type { PublicRoom } from './types'

export const DEFAULT_MAX_ROUNDS = 5

export function normalizeMaxRounds(value: unknown): number {
  let n = value
  if (typeof n === 'string' && n.trim() !== '') n = Number(n)
  if (typeof n === 'number' && Number.isFinite(n) && n >= 0) return Math.round(n)
  return DEFAULT_MAX_ROUNDS
}

export function normalizePublicRoom(room: PublicRoom): PublicRoom {
  return { ...room, maxRounds: normalizeMaxRounds(room.maxRounds) }
}
