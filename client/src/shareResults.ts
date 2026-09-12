import { fill, type Ui } from './i18n'
import type { PublicRoom } from './types'

export function buildResultsText(room: PublicRoom, ui: Ui): string {
  const header = `Your Task Is — ${room.code}`
  const lines: string[] = [header, '']
  const winner = room.scores[0]
  if (winner) {
    lines.push(fill(ui.shareWinnerLine, { name: winner.name, score: winner.score }))
  }
  if (room.challenge?.title) {
    lines.push(fill(ui.shareLastChallenge, { title: room.challenge.title }))
  }
  lines.push('')
  for (const [i, s] of room.scores.entries()) {
    lines.push(`${i + 1}. ${s.name} — ${s.score} ${ui.points}`)
  }
  lines.push('', 'yourtaskis.com')
  return lines.join('\n')
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
