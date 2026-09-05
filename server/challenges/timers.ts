import type { ChallengeType, SubmissionMode } from '../challengeTypes.js'

/** Generous default timers (~2–3× original). Endurance stays host-ended. */
export function defaultTimer(
  type: ChallengeType,
  mode?: SubmissionMode,
): number | undefined {
  if (type === 'endurance') return undefined
  if (mode === 'draw') return 180
  if (mode === 'text') return 120
  if (type === 'speed') return 120
  if (type === 'creative') return 150
  if (type === 'subjective') return 90
  return 120
}
