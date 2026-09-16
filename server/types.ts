import type { ChallengeType, SubmissionMode } from './challengeTypes.js'

export type RoomStatus = 'lobby' | 'challenge' | 'judging' | 'scores' | 'finished'

export type ReactionEmoji = 'laugh' | 'fire' | 'skull'
export type TypeVote = ChallengeType | 'surprise'

export type ReactionEntry = {
  from: string
  to: string
  emoji: ReactionEmoji
}

export type ComebackHighlight = {
  playerId: string
  playerName: string
  fromRank: number
  toRank: number
}

export type HandicapInfo = {
  playerId: string
  playerName: string
  text: string
}

export type RoundHistoryEntry = {
  roundIndex: number
  challengeTitle: string
  challengeType: ChallengeType
  submissionMode: SubmissionMode
  pointsByPlayer: Record<string, number>
}

export type SessionAward = {
  id: string
  playerId: string
  playerName: string
}

export type Player = {
  id: string
  name: string
  connected: boolean
  score: number
  /** Joined mid-game — plays from the next round. */
  pendingRound?: boolean
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
  reactionLog: ReactionEntry[]
  typeVotes: Record<string, TypeVote>
  roundHistory: RoundHistoryEntry[]
  fiveStarCounts: Record<string, number>
  comeback: ComebackHighlight | null
  handicap: HandicapInfo | null
  sessionAwards: SessionAward[] | null
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
  youPendingRound: boolean
  minParticipants: number
  reactions: Record<string, Partial<Record<ReactionEmoji, number>>>
  typeVoteCounts: Record<TypeVote, number>
  yourTypeVote: TypeVote | null
  comeback: ComebackHighlight | null
  handicap: HandicapInfo | null
  awards: SessionAward[] | null
}
