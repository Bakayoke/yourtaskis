export type ChallengeType = 'speed' | 'creative' | 'subjective' | 'endurance'

export type SubmissionMode = 'draw' | 'text' | 'physical'

export interface Challenge {
  id: string
  title: string
  description: string
  type: ChallengeType
  /** Undefined = testledaren avslutar när det är klart */
  timeLimitSeconds?: number
  submissionMode?: SubmissionMode
}
