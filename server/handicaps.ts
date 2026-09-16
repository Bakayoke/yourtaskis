export const HANDICAP_TEXTS = [
  'Du får bara använda fel hand.',
  'Du måste stå på ett ben hela testet.',
  'Du får inte använda tummarna.',
  'Du måste hålla något på huvudet.',
  'Allt du säger måste viskas.',
  'Du får inte sätta dig ner.',
  'Du måste hålla armarna korsslagna.',
] as const

export function pickHandicapText(roundIndex: number): string {
  return HANDICAP_TEXTS[roundIndex % HANDICAP_TEXTS.length]!
}
