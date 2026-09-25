import type { Challenge, SubmissionMode } from './challengeTypes.js'

function submissionModeFor(challenge: Challenge): SubmissionMode {
  if (challenge.submissionMode) return challenge.submissionMode
  if (challenge.type === 'endurance') return 'physical'
  if (challenge.description.includes('Rita') || challenge.description.includes('rita')) return 'draw'
  if (challenge.description.includes('Skriv') || challenge.description.includes('skriv')) return 'text'
  return 'physical'
}

export type DeckId = 'classic' | 'family' | 'mild' | 'wild' | 'creative'

export const DECK_IDS: DeckId[] = ['classic', 'family', 'mild', 'wild', 'creative']

const SPICY = /shot|fylla|stripp|sex|alkohol|nsfw|öl|vin|drick/i

export function normalizeDeckId(value: unknown): DeckId {
  if (typeof value === 'string' && (DECK_IDS as string[]).includes(value)) {
    return value as DeckId
  }
  return 'classic'
}

export function challengeMatchesDeck(challenge: Challenge, deckId: DeckId): boolean {
  if (deckId === 'classic') return true

  const mode = submissionModeFor(challenge)
  const text = `${challenge.title} ${challenge.description}`

  if (deckId === 'family') {
    if (SPICY.test(text)) return false
    if (mode === 'physical' && /lök|shots|stripp|shots/i.test(text)) return false
    return true
  }

  if (deckId === 'mild') {
    return !SPICY.test(text)
  }

  if (deckId === 'wild') {
    return (
      challenge.type === 'speed' ||
      challenge.type === 'endurance' ||
      mode === 'physical'
    )
  }

  if (deckId === 'creative') {
    return challenge.type === 'creative' || mode === 'draw' || mode === 'text'
  }

  return true
}
