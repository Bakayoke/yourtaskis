import { useState } from 'react'
import { queueCustomChallenge } from './api'
import type { Ui } from './i18n'
import type { ChallengeType, PublicRoom, SubmissionMode } from './types'

type Props = {
  room: PublicRoom
  ui: Ui
  disabled?: boolean
  onError?: (message: string) => void
}

export function CustomChallengePanel({ room, ui, disabled, onError }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<ChallengeType>('creative')
  const [mode, setMode] = useState<SubmissionMode>('draw')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)

  if (!room.youAreHost) return null

  async function submit() {
    if (busy || !title.trim() || !description.trim()) return
    setBusy(true)
    setOk(false)
    const res = await queueCustomChallenge({
      title: title.trim(),
      description: description.trim(),
      type,
      submissionMode: mode,
    })
    setBusy(false)
    if (res.ok) {
      setOk(true)
      setOpen(false)
      setTitle('')
      setDescription('')
    } else {
      onError?.(res.error ?? ui.errorGeneric)
    }
  }

  return (
    <div className="custom-challenge">
      <button
        type="button"
        className="btn secondary"
        disabled={disabled || busy}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? ui.customClose : ui.customOpen}
      </button>
      {ok && <p className="ok-msg">{ui.customQueued}</p>}
      {open && (
        <div className="custom-challenge-form">
          <label>
            {ui.customTitle}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder={ui.customTitlePh}
            />
          </label>
          <label>
            {ui.customDesc}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder={ui.customDescPh}
            />
          </label>
          <div className="custom-challenge-row">
            <label>
              {ui.customType}
              <select
                value={type}
                onChange={(e) => {
                  const t = e.target.value as ChallengeType
                  setType(t)
                  if (t === 'creative') setMode('draw')
                  else if (t === 'subjective') setMode('text')
                  else setMode('physical')
                }}
              >
                <option value="creative">{ui.typeCreative}</option>
                <option value="subjective">{ui.typeSubjective}</option>
                <option value="speed">{ui.typeSpeed}</option>
                <option value="endurance">{ui.typeEndurance}</option>
              </select>
            </label>
            <label>
              {ui.customMode}
              <select value={mode} onChange={(e) => setMode(e.target.value as SubmissionMode)}>
                <option value="draw">{ui.modeDraw}</option>
                <option value="text">{ui.modeText}</option>
                <option value="physical">{ui.modePhysical}</option>
              </select>
            </label>
          </div>
          <button type="button" className="btn primary" disabled={busy || !title.trim() || !description.trim()} onClick={() => void submit()}>
            {ui.customSubmit}
          </button>
        </div>
      )}
    </div>
  )
}
