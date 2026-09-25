import { useState } from 'react'
import { setDeck } from './api'
import { fill, type Ui } from './i18n'
import { normalizeDeckId } from './roomUtils'
import type { DeckId } from './types'

const DECKS: DeckId[] = ['classic', 'family', 'mild', 'wild', 'creative']

type Props = {
  deckId: DeckId
  disabled?: boolean
  variant?: 'mobile' | 'tv'
  ui: Ui
  onChange?: (deckId: DeckId) => void
  onError?: (message: string) => void
}

function deckLabel(deckId: DeckId, ui: Ui) {
  const map: Record<DeckId, string> = {
    classic: ui.deckClassic,
    family: ui.deckFamily,
    mild: ui.deckMild,
    wild: ui.deckWild,
    creative: ui.deckCreative,
  }
  return map[deckId]
}

export function DeckSelector({ deckId, disabled, variant = 'mobile', ui, onChange, onError }: Props) {
  const current = normalizeDeckId(deckId)
  const [busy, setBusy] = useState(false)
  const pillClass = variant === 'tv' ? 'round-pill tv' : 'round-pill'

  async function pick(id: DeckId) {
    if (disabled || busy || id === current) return
    setBusy(true)
    const res = await setDeck(id)
    setBusy(false)
    if (res.ok) onChange?.(id)
    else onError?.(res.error ?? ui.errorGeneric)
  }

  return (
    <div className={`deck-selector${variant === 'tv' ? ' tv' : ''}`}>
      <p className="deck-label">{ui.deckTitle}</p>
      <div className="round-pills" role="group" aria-label={ui.deckTitle}>
        {DECKS.map((id) => (
          <button
            key={id}
            type="button"
            className={`${pillClass}${current === id ? ' active' : ''}`}
            disabled={disabled || busy}
            aria-pressed={current === id}
            onClick={() => void pick(id)}
          >
            {deckLabel(id, ui)}
          </button>
        ))}
      </div>
      <p className="muted deck-hint">{fill(ui.deckHint, { deck: deckLabel(current, ui) })}</p>
    </div>
  )
}
