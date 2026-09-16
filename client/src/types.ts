export type RoomStatus = 'lobby' | 'challenge' | 'judging' | 'scores' | 'finished'

export type ChallengeType = 'speed' | 'creative' | 'subjective' | 'endurance'
export type SubmissionMode = 'draw' | 'text' | 'physical'
export type ReactionEmoji = 'laugh' | 'fire' | 'skull'
export type TypeVote = ChallengeType | 'surprise'

export type Player = {
  id: string
  name: string
  connected: boolean
  score: number
  pendingRound?: boolean
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

export type SessionAward = {
  id: string
  playerId: string
  playerName: string
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

export type Session = {
  code: string
  playerId: string
  name: string
}
