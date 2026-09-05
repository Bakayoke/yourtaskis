import type { ChallengeType, SubmissionMode } from './challengeTypes.js'

export type RoomStatus = 'lobby' | 'challenge' | 'judging' | 'scores' | 'finished'

export type Player = {
  id: string
  name: string
  connected: boolean
  score: number
}

export type Submission = {
  playerId: string
  payload: string
  submittedAt: number
}

export type Room = {
  code: string
  hostId: string
  players: Player[]
  status: RoomStatus
  roundIndex: number
  /** 0 = unlimited rounds */
  maxRounds: number
  currentChallengeId: string | null
  phaseEndsAt: number
  submissions: Submission[]
  /** Current round scores before reveal (host only sees during judging) */
  roundScores: Record<string, number>
  usedChallengeIds: string[]
  updatedAt: number
}

export type PublicChallenge = {
  id: string
  title: string
  description: string
  type: ChallengeType
  timeLimitSeconds: number | null
  submissionMode: SubmissionMode
}

export type PublicSubmission = {
  playerId: string
  playerName: string
  payload: string
  submittedAt: number
}

export type PublicRoom = {
  code: string
  hostId: string
  hostName: string
  players: Player[]
  status: RoomStatus
  roundIndex: number
  maxRounds: number
  challenge: PublicChallenge | null
  phaseEndsAt: number
  /** Host sees all; participants only see their own until judging */
  submissions: PublicSubmission[]
  youSubmitted: boolean
  submittedCount: number
  participantCount: number
  roundScores: { playerId: string; name: string; points: number }[] | null
  scores: { playerId: string; name: string; score: number }[]
  youAreHost: boolean
  minParticipants: number
}
