import { fill, type Ui } from './i18n'
import type { PublicRoom, PublicSubmission } from './types'

function SubmissionBody({ sub, ui }: { sub: PublicSubmission; ui: Ui }) {
  if (sub.payload.startsWith('data:image')) {
    return <img src={sub.payload} alt={sub.playerName} className="submission-gallery-img" />
  }
  if (sub.payload === 'ready') {
    return <p className="muted">{ui.physicalJudge}</p>
  }
  if (sub.payload.trim()) {
    return <p className="submission-gallery-text">{sub.payload}</p>
  }
  return <p className="muted">{ui.noSubmission}</p>
}

export function SubmissionGallery({
  room,
  ui,
  tv = false,
  compact = false,
}: {
  room: PublicRoom
  ui: Ui
  tv?: boolean
  compact?: boolean
}) {
  const subs = room.submissions.filter((s) => s.playerId !== room.hostId)
  if (subs.length === 0 || !room.challenge) return null

  return (
    <section
      className={`submission-gallery${tv ? ' tv' : ''}${compact ? ' compact' : ''}`}
      aria-label={ui.submissionsReveal}
    >
      <h3>{fill(ui.submissionsForRound, { title: room.challenge.title })}</h3>
      <div className="submission-gallery-grid">
        {subs.map((sub) => (
          <article key={sub.playerId} className="submission-gallery-card">
            <p className="submission-gallery-name">{sub.playerName}</p>
            <SubmissionBody sub={sub} ui={ui} />
          </article>
        ))}
      </div>
    </section>
  )
}
