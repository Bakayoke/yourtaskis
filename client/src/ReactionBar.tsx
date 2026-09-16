import { addReaction } from './api'
import type { Ui } from './i18n'
import type { PublicRoom, ReactionEmoji } from './types'

const EMOJIS: { id: ReactionEmoji; label: string }[] = [
  { id: 'laugh', label: '😂' },
  { id: 'fire', label: '🔥' },
  { id: 'skull', label: '💀' },
]

export function ReactionBar({
  room,
  targetPlayerId,
  ui,
}: {
  room: PublicRoom
  targetPlayerId: string
  ui: Ui
}) {
  if (room.youAreHost) return null

  const counts = room.reactions[targetPlayerId] ?? {}

  async function react(emoji: ReactionEmoji) {
    await addReaction(targetPlayerId, emoji)
  }

  return (
    <div className="reaction-bar" aria-label={ui.reactionsLabel}>
      {EMOJIS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className="reaction-btn"
          title={ui.reactionsLabel}
          onClick={() => void react(id)}
        >
          <span>{label}</span>
          {(counts[id] ?? 0) > 0 && <em>{counts[id]}</em>}
        </button>
      ))}
    </div>
  )
}
