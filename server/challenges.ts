export type ChallengeType = 'speed' | 'creative' | 'subjective' | 'endurance'

export type SubmissionMode = 'draw' | 'text' | 'physical'

export interface Challenge {
  id: string
  title: string
  description: string
  type: ChallengeType
  /** Undefined = testledaren avslutar när det är klart */
  timeLimitSeconds?: number
}

export const starterChallenges: Challenge[] = [
  {
    id: 'c-001',
    title: 'Porträtt i mörker',
    description:
      'Rita ett storslaget porträtt av testledaren. Haken: Du måste blunda hela tiden. Din tid börjar nu.',
    type: 'creative',
    timeLimitSeconds: 60,
  },
  {
    id: 'c-002',
    title: 'Något blått',
    description:
      'Hämta det största blåa föremålet du kan hitta. Snabbast tillbaka med störst föremål vinner. Din tid börjar nu.',
    type: 'speed',
    timeLimitSeconds: 45,
  },
  {
    id: 'c-003',
    title: 'Få mig att skratta',
    description: 'Få testledaren att skratta. Den som lyckas snabbast vinner.',
    type: 'speed',
  },
  {
    id: 'c-004',
    title: 'Perfekt cirkel',
    description:
      'Rita en så perfekt cirkel som möjligt. Du får inte använda några hjälpmedel. Testledarens dom är slutgiltig.',
    type: 'subjective',
    timeLimitSeconds: 30,
  },
  {
    id: 'c-005',
    title: 'Längsta ljudet',
    description:
      'Ta ett djupt andetag och gör ett valfritt ljud. Den som kan hålla samma ljud längst utan att andas vinner.',
    type: 'endurance',
  },
  {
    id: 'c-006',
    title: 'Tornet',
    description:
      'Bygg det högsta tornet av föremål du har inom en meters radie just nu. Du får inte ställa dig upp.',
    type: 'creative',
    timeLimitSeconds: 60,
  },
  {
    id: 'c-007',
    title: 'Hemligt uppdrag',
    description:
      'Hitta på ett nytt smeknamn på personen till vänster om dig. Bäst motivering till namnet vinner. Smeknamnet gäller resten av spelet.',
    type: 'subjective',
    timeLimitSeconds: 60,
  },
  {
    id: 'c-008',
    title: 'Mest oväntade ljudet',
    description:
      'Gör det absolut mest oväntade ljudet med din egen kropp. Testledaren bedömer vem som var konstigast.',
    type: 'subjective',
  },
  {
    id: 'c-009',
    title: 'Göm dig',
    description:
      'Göm dig för skärmen/testledaren. Den som testledaren hittar (eller ser) SIST vinner.',
    type: 'speed',
    timeLimitSeconds: 30,
  },
  {
    id: 'c-010',
    title: 'Sista smset',
    description:
      'Läs upp det senaste SMS:et du tog emot högt, men med rösten av en nyhetsankare som rapporterar en tragedi. Bäst inlevelse vinner.',
    type: 'creative',
  },
]

const challengeById = new Map(starterChallenges.map((c) => [c.id, c]))

export function getChallenge(id: string): Challenge | undefined {
  return challengeById.get(id)
}

/** How participants submit for this challenge in the app. */
export function submissionModeFor(challenge: Challenge): SubmissionMode {
  if (challenge.id === 'c-001' || challenge.id === 'c-004') return 'draw'
  if (challenge.id === 'c-007' || challenge.id === 'c-010') return 'text'
  return 'physical'
}

export function pickNextChallenge(usedIds: string[]): Challenge {
  const unused = starterChallenges.filter((c) => !usedIds.includes(c.id))
  const pool = unused.length > 0 ? unused : starterChallenges
  return pool[Math.floor(Math.random() * pool.length)]!
}
