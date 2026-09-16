import { voteNextType } from './api'
import { challengeTypeLabel } from './challengeTypeLabel'
import { fill, type Ui } from './i18n'
import type { ChallengeType, PublicRoom, TypeVote } from './types'

const VOTES: TypeVote[] = ['speed', 'creative', 'subjective', 'endurance', 'surprise']

export function TypeVotePanel({ room, ui }: { room: PublicRoom; ui: Ui }) {
  if (room.status !== 'scores' || room.youAreHost || room.youPendingRound) return null

  async function vote(v: TypeVote) {
    await voteNextType(v)
  }

  function label(v: TypeVote) {
    if (v === 'surprise') return ui.voteSurprise
    return challengeTypeLabel(v, ui)
  }

  return (
    <section className="type-vote">
      <h3>{ui.voteNextTitle}</h3>
      <p className="muted">{ui.voteNextHint}</p>
      <div className="type-vote-grid">
        {VOTES.map((v) => (
          <button
            key={v}
            type="button"
            className={`btn secondary type-vote-btn${room.yourTypeVote === v ? ' selected' : ''}`}
            onClick={() => void vote(v)}
          >
            {label(v)}
            {(room.typeVoteCounts[v] ?? 0) > 0 && (
              <span className="type-vote-count">{room.typeVoteCounts[v]}</span>
            )}
          </button>
        ))}
      </div>
      {room.yourTypeVote && (
        <p className="ok-msg">{fill(ui.voteSelected, { type: label(room.yourTypeVote) })}</p>
      )}
    </section>
  )
}

export function TypeVoteHostSummary({ room, ui }: { room: PublicRoom; ui: Ui }) {
  if (room.status !== 'scores' || !room.youAreHost) return null
  const total = Object.values(room.typeVoteCounts).reduce((a, b) => a + b, 0)
  if (total === 0) return null

  const top = [...VOTES].sort((a, b) => (room.typeVoteCounts[b] ?? 0) - (room.typeVoteCounts[a] ?? 0))[0]!

  function label(v: TypeVote) {
    if (v === 'surprise') return ui.voteSurprise
    return challengeTypeLabel(v as ChallengeType, ui)
  }

  return (
    <p className="muted type-vote-host">
      {fill(ui.voteHostSummary, { type: label(top), n: room.typeVoteCounts[top] ?? 0, total })}
    </p>
  )
}
