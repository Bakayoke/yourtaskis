import { useState } from 'react'
import { setMaxRounds } from './api'

const PRESETS = [
  { value: 3, label: '3' },
  { value: 5, label: '5' },
  { value: 7, label: '7' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
  { value: 0, label: '∞' },
] as const

type Props = {
  maxRounds: number
  disabled?: boolean
  variant?: 'mobile' | 'tv'
  onChange?: (maxRounds: number) => void
}

function isPreset(value: number) {
  return PRESETS.some((p) => p.value === value)
}

export function RoundSelector({ maxRounds, disabled, variant = 'mobile', onChange }: Props) {
  const [custom, setCustom] = useState(!isPreset(maxRounds) && maxRounds > 0)
  const [customValue, setCustomValue] = useState(
    !isPreset(maxRounds) && maxRounds > 0 ? String(maxRounds) : '20',
  )
  const [busy, setBusy] = useState(false)

  async function pick(value: number) {
    if (disabled || busy) return
    setCustom(false)
    setBusy(true)
    try {
      const res = await setMaxRounds(value)
      if (res.ok && res.room) onChange?.(res.room.maxRounds)
    } finally {
      setBusy(false)
    }
  }

  async function applyCustom() {
    const n = Math.round(Number(customValue))
    if (!Number.isFinite(n) || n < 1 || n > 99) return
    setBusy(true)
    try {
      const res = await setMaxRounds(n)
      if (res.ok && res.room) onChange?.(res.room.maxRounds)
    } finally {
      setBusy(false)
    }
  }

  const pillClass = variant === 'tv' ? 'tv-round-pill' : 'round-pill-btn'
  const rowClass = variant === 'tv' ? 'tv-round-picker' : 'round-picker'

  return (
    <div className={rowClass}>
      <p className={variant === 'tv' ? 'tv-muted' : 'muted'}>
        Antal test
        {maxRounds === 0 ? ' · tills vi tröttnar' : maxRounds > 0 ? ` · ${maxRounds} rundor` : ''}
      </p>
      <div className="round-pill-row">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            className={`${pillClass}${!custom && maxRounds === p.value ? ' active' : ''}`}
            disabled={disabled || busy}
            title={p.value === 0 ? 'Tills vi tröttnar' : undefined}
            onClick={() => void pick(p.value)}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className={`${pillClass}${custom ? ' active' : ''}`}
          disabled={disabled || busy}
          onClick={() => setCustom(true)}
        >
          …
        </button>
      </div>
      {custom && (
        <div className="round-custom">
          <input
            type="number"
            min={1}
            max={99}
            value={customValue}
            disabled={disabled || busy}
            onChange={(e) => setCustomValue(e.target.value)}
            className={variant === 'tv' ? 'tv-input compact' : ''}
          />
          <button
            type="button"
            className={variant === 'tv' ? 'tv-btn secondary' : 'btn secondary'}
            disabled={disabled || busy}
            onClick={() => void applyCustom()}
          >
            Sätt
          </button>
        </div>
      )}
    </div>
  )
}

export function roundLabel(roundIndex: number, maxRounds: number) {
  if (roundIndex <= 0) return null
  if (maxRounds > 0) return `Runda ${roundIndex}/${maxRounds}`
  return `Runda ${roundIndex}`
}
