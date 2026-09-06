import type { Ui } from './i18n'
import type { PublicRoom } from './types'

export function buildResultsText(room: PublicRoom, ui: Ui): string {
  const header = `Your Task Is — ${room.code}`
  const lines = room.scores.map((s, i) => `${i + 1}. ${s.name} — ${s.score} ${ui.points}`)
  return [header, '', ...lines, '', 'yourtaskis.com'].join('\n')
}

export async function copyResults(room: PublicRoom, ui: Ui): Promise<boolean> {
  const text = buildResultsText(room, ui)
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export async function shareResults(room: PublicRoom, ui: Ui): Promise<'shared' | 'copied' | 'failed'> {
  const text = buildResultsText(room, ui)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Your Task Is',
        text,
        url: 'https://yourtaskis.com',
      })
      return 'shared'
    } catch {
      /* user cancelled or blocked */
    }
  }
  return (await copyResults(room, ui)) ? 'copied' : 'failed'
}
