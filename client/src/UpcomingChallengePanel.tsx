import { skipUpcomingChallenge } from './api'
import { challengeTypeLabel } from './challengeTypeLabel'
import { fill, type Ui } from './i18n'
import type { PublicRoom } from './types'

type Props = {
  room: PublicRoom
  ui: Ui
  disabled?: boolean
  onError?: (message: string) => void
}

export function UpcomingChallengePanel({ room, ui, disabled, onError }: Props) {
  const next = room.upcomingChallenge
  if (!next || room.status !== 'scores') return null

  async function skip() {
    const res = await skipUpcomingChallenge()
    if (!res.ok) onError?.(res.error ?? ui.errorGeneric)
  }

  return (
    <div className="upcoming-challenge">
      <h3>{ui.upcomingTitle}</h3>
      <p className="eyebrow">{challengeTypeLabel(next.type, ui)}</p>
      <p className="upcoming-name">
        <strong>{next.title}</strong>
      </p>
      <p className="muted upcoming-desc">{next.description}</p>
      {room.youAreHost && (
        <button type="button" className="btn ghost small" disabled={disabled} onClick={() => void skip()}>
          {ui.upcomingSkip}
        </button>
      )}
      {!room.youAreHost && <p className="muted">{fill(ui.upcomingTeaser, { title: next.title })}</p>}
    </div>
  )
}
