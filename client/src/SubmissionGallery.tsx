import { useState } from 'react'
import { fill, type Ui } from './i18n'
import { ReactionBar } from './ReactionBar'
import { shareDrawing } from './shareDrawing'
import type { PublicRoom, PublicSubmission, ReactionEmoji } from './types'

const EMOJI: Record<ReactionEmoji, string> = { laugh: '😂', fire: '🔥', skull: '💀' }

function ReactionCounts({ counts }: { counts: Partial<Record<ReactionEmoji, number>> }) {
  const entries = (Object.entries(counts) as [ReactionEmoji, number][]).filter(([, n]) => n > 0)
  if (entries.length === 0) return null
  return (
    <div className="reaction-counts">
      {entries.map(([id, n]) => (
        <span key={id}>
          {EMOJI[id]} {n}
        </span>
      ))}
    </div>
  )
}

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
  showReactions = false,
}: {
  room: PublicRoom
  ui: Ui
  tv?: boolean
  compact?: boolean
  showReactions?: boolean
}) {
  const [shareMsg, setShareMsg] = useState<string | null>(null)
  const subs = room.submissions.filter((s) => s.playerId !== room.hostId)
  if (subs.length === 0 || !room.challenge) return null

  async function handleShare(sub: PublicSubmission) {
    const res = await shareDrawing(sub.payload, `${sub.playerName} — ${room.challenge!.title}`)
    setShareMsg(res === 'shared' ? ui.drawingShared : res === 'copied' ? ui.drawingSaved : ui.drawingShareFailed)
    window.setTimeout(() => setShareMsg(null), 2500)
  }

  return (
    <section
      className={`submission-gallery${tv ? ' tv' : ''}${compact ? ' compact' : ''}`}
      aria-label={ui.submissionsReveal}
    >
      <h3>{fill(ui.submissionsForRound, { title: room.challenge.title })}</h3>
      {shareMsg && <p className="ok-msg">{shareMsg}</p>}
      <div className="submission-gallery-grid">
        {subs.map((sub) => (
          <article key={sub.playerId} className="submission-gallery-card">
            <p className="submission-gallery-name">{sub.playerName}</p>
            <SubmissionBody sub={sub} ui={ui} />
            <ReactionCounts counts={room.reactions[sub.playerId] ?? {}} />
            {!tv && sub.payload.startsWith('data:image') && (
              <button type="button" className="btn ghost small" onClick={() => void handleShare(sub)}>
                {ui.shareDrawing}
              </button>
            )}
            {!tv && showReactions && (
              <ReactionBar room={room} targetPlayerId={sub.playerId} ui={ui} />
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
