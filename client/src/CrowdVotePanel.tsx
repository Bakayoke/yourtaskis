import { crowdVote, finishCrowdVoting } from './api'
import { fill, type Ui } from './i18n'
import type { PublicRoom } from './types'

type Props = {
  room: PublicRoom
  ui: Ui
  disabled?: boolean
  onError?: (message: string) => void
}

export function CrowdVotePanel({ room, ui, disabled, onError }: Props) {
  if (room.status !== 'judging' || room.judgingMode !== 'crowd') return null

  const participants = room.players.filter((p) => p.id !== room.hostId && !p.pendingRound)

  async function vote(targetId: string) {
    const res = await crowdVote(targetId)
    if (!res.ok) onError?.(res.error ?? ui.errorGeneric)
  }

  async function finish() {
    const res = await finishCrowdVoting()
    if (!res.ok) onError?.(res.error ?? ui.errorGeneric)
  }

  if (room.youAreHost) {
    return (
      <div className="crowd-vote host">
        <h3>{ui.crowdHostTitle}</h3>
        <p className="muted">{ui.crowdHostHint}</p>
        <ul className="crowd-tally">
          {participants.map((p) => (
            <li key={p.id}>
              {p.name}: <strong>{room.crowdVoteCounts[p.id] ?? 0}</strong> {ui.crowdVotesWord}
            </li>
          ))}
        </ul>
        <p className="muted">
          {fill(ui.crowdProgress, {
            done: room.crowdVotesDone,
            total: room.participantCount,
          })}
        </p>
        <button type="button" className="btn primary" disabled={disabled} onClick={() => void finish()}>
          {ui.crowdFinish}
        </button>
      </div>
    )
  }

  return (
    <div className="crowd-vote">
      <h3>{ui.crowdTitle}</h3>
      <p className="muted">{ui.crowdHint}</p>
      {room.yourCrowdVote ? (
        <p className="ok-msg">
          {fill(ui.crowdSelected, {
            name: participants.find((p) => p.id === room.yourCrowdVote)?.name ?? '?',
          })}
        </p>
      ) : (
        <div className="crowd-pick-grid">
          {participants.map((p) => (
            <button
              key={p.id}
              type="button"
              className="btn secondary"
              disabled={disabled}
              onClick={() => void vote(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function CrowdRoundBanner({ room, ui }: { room: PublicRoom; ui: Ui }) {
  if (room.judgingMode !== 'crowd') return null
  if (room.status !== 'challenge' && room.status !== 'judging') return null
  return (
    <p className="crowd-banner" role="status">
      {ui.crowdRoundBanner}
    </p>
  )
}
