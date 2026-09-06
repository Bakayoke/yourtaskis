import { useEffect, useState } from 'react'
import { setMaxRounds } from './api'
import { fill, type Ui } from './i18n'
import { normalizeMaxRounds } from './roomUtils'

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
  ui: Ui
  onChange?: (maxRounds: number) => void
  onError?: (message: string) => void
}

function isPreset(value: number) {
  return PRESETS.some((p) => p.value === value)
}

export function selectedRoundSummary(maxRounds: number, ui: Ui) {
  const rounds = normalizeMaxRounds(maxRounds)
  if (rounds === 0) return ui.roundSelectedUnlimited
  const word = rounds === 1 ? ui.roundWordOne : ui.roundWordMany
  return fill(ui.roundSelected, { n: rounds, word })
}

export function RoundSelector({ maxRounds, disabled, variant = 'mobile', ui, onChange, onError }: Props) {
  const rounds = normalizeMaxRounds(maxRounds)
  const [custom, setCustom] = useState(!isPreset(rounds) && rounds > 0)
  const [customValue, setCustomValue] = useState(
    !isPreset(rounds) && rounds > 0 ? String(rounds) : '20',
  )
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const isCustomValue = !isPreset(rounds) && rounds > 0
    setCustom(isCustomValue)
    if (isCustomValue) setCustomValue(String(rounds))
  }, [rounds])

  async function pick(value: number) {
    if (disabled || busy || value === rounds) return
    setCustom(false)
    const previous = rounds
    onChange?.(value)
    setBusy(true)
    try {
      const res = await setMaxRounds(value)
      if (res.ok) {
        const next = normalizeMaxRounds(res.room?.maxRounds ?? value)
        if (next !== value) onChange?.(next)
      } else {
        onChange?.(previous)
        onError?.(res.error ?? ui.errorGeneric)
      }
    } catch (e) {
      onChange?.(previous)
      onError?.(e instanceof Error ? e.message : ui.errorGeneric)
    } finally {
      setBusy(false)
    }
  }

  async function applyCustom() {
    const n = Math.round(Number(customValue))
    if (!Number.isFinite(n) || n < 1 || n > 99) return
    if (n === rounds) return
    const previous = rounds
    onChange?.(n)
    setBusy(true)
    try {
      const res = await setMaxRounds(n)
      if (res.ok) {
        const next = normalizeMaxRounds(res.room?.maxRounds ?? n)
        if (next !== n) onChange?.(next)
      } else {
        onChange?.(previous)
        onError?.(res.error ?? ui.errorGeneric)
      }
    } catch (e) {
      onChange?.(previous)
      onError?.(e instanceof Error ? e.message : ui.errorGeneric)
    } finally {
      setBusy(false)
    }
  }

  const pillClass = variant === 'tv' ? 'tv-round-pill' : 'round-pill-btn'
  const rowClass = variant === 'tv' ? 'tv-round-picker' : 'round-picker'
  const summaryClass = variant === 'tv' ? 'round-selection-summary tv' : 'round-selection-summary'
  const customApplied = custom && !isPreset(rounds) && rounds > 0
  const customLabel = customApplied ? String(rounds) : '…'

  return (
    <div className={rowClass}>
      <p className={variant === 'tv' ? 'tv-round-label' : 'round-label'}>{ui.roundCount}</p>
      <p className={summaryClass} aria-live="polite">
        {selectedRoundSummary(rounds, ui)}
      </p>
      <div className="round-pill-row">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            className={`${pillClass}${!custom && rounds === p.value ? ' active' : ''}`}
            disabled={disabled || busy}
            aria-pressed={!custom && rounds === p.value}
            title={p.value === 0 ? ui.roundUnlimitedTitle : undefined}
            onClick={() => void pick(p.value)}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className={`${pillClass}${custom ? ' active' : ''}`}
          disabled={disabled || busy}
          aria-pressed={custom}
          title={ui.roundCustom}
          onClick={() => setCustom(true)}
        >
          {customLabel}
        </button>
      </div>
      {custom && (
        <div className={`round-custom${variant === 'tv' ? ' tv' : ''}`}>
          <label className="round-custom-field">
            <span className={variant === 'tv' ? 'tv-muted' : 'muted'}>{ui.roundCustomLabel}</span>
            <input
              type="number"
              min={1}
              max={99}
              value={customValue}
              disabled={disabled || busy}
              aria-label={ui.roundCustomLabel}
              onChange={(e) => setCustomValue(e.target.value)}
              className={`round-custom-input${variant === 'tv' ? ' tv-input' : ''}${customApplied && customValue === String(rounds) ? ' is-applied' : ''}`}
            />
          </label>
          <button
            type="button"
            className={variant === 'tv' ? 'tv-btn secondary' : 'btn secondary'}
            disabled={disabled || busy}
            onClick={() => void applyCustom()}
          >
            {ui.roundSet}
          </button>
        </div>
      )}
    </div>
  )
}

export function roundLabel(roundIndex: number, maxRounds: number, ui: Ui) {
  if (roundIndex <= 0) return null
  if (maxRounds > 0) return fill(ui.roundLabel, { n: roundIndex, max: maxRounds })
  return fill(ui.roundLabelOpen, { n: roundIndex })
}
