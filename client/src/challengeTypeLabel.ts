import type { Ui } from './i18n'

export function challengeTypeLabel(type: string, ui: Ui): string {
  const map: Record<string, string> = {
    speed: ui.typeSpeed,
    creative: ui.typeCreative,
    subjective: ui.typeSubjective,
    endurance: ui.typeEndurance,
  }
  return map[type] ?? type
}
