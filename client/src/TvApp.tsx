import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useFullscreen } from './useFullscreen'
import { useHostScores } from './useHostScores'
import { SisterGames } from './SisterGames'
import { WinnerReveal } from './WinnerReveal'
import { LanguageToggle } from './LanguageToggle'
import { fill, loadLanguage, rememberLanguage, t, type Lang } from './i18n'
import { formatError } from './translateError'
import {
  backToLobby,
  clearSession,
  closeLobby,
  createGame,
  endChallenge,
  endGame,
  ensureSessionBound,
  joinUrl,
  loadSession,
  nextRound,
  removePlayer,
  rejoinGame,
  saveSession,
  scorePlayer,
  setRoomHandler,
  setRoomClosedHandler,
  startGame,
  subscribeConnection,
  type ConnState,
} from './api'
import { JoinQr } from './qr'
import { RoundSelector, roundLabel } from './RoundSelector'
import { normalizePublicRoom } from './roomUtils'
import { useChallengeTimerSound } from './useChallengeTimerSound'
import type { PublicRoom } from './types'

function useCountdown(endsAt: number) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!endsAt) return
    const t = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(t)
  }, [endsAt])
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

const typeLabel = (type: string, ui: ReturnType<typeof t>) => {
  const map: Record<string, string> = {
    speed: ui.typeSpeed,
    creative: ui.typeCreative,
    subjective: ui.typeSubjective,
    endurance: ui.typeEndurance,
  }
  return map[type] ?? type
}

function TvScoreboard({ room }: { room: PublicRoom }) {
  return (
    <ol className="tv-scoreboard">
      {room.scores.map((s, i) => (
        <li key={s.playerId} className={i === 0 ? 'leader' : ''}>
          <span className="rank">{i + 1}</span>
          <span className="name">{s.name}</span>
          <span className="pts">{s.score} p</span>
        </li>
      ))}
    </ol>
  )
}

export default function TvApp() {
  const [lang, setLang] = useState<Lang>(() => loadLanguage())
  const ui = t(lang)
  const [room, setRoom] = useState<PublicRoom | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [conn, setConn] = useState<ConnState>('connecting')
  const [booting, setBooting] = useState(true)
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true)
  const fullscreen = useFullscreen()
  const { scores: hostScores, recordScore } = useHostScores(room)

  const countdown = useCountdown(room?.phaseEndsAt ?? 0)
  const joinLink = useMemo(() => (room ? joinUrl(room.code) : ''), [room])

  useChallengeTimerSound(
    countdown,
    room?.status === 'challenge' && room.challenge?.timeLimitSeconds != null,
    room?.roundIndex ?? 0,
  )

  const participants = useMemo(
    () => room?.players.filter((p) => p.id !== room.hostId) ?? [],
    [room],
  )

  const activeParticipants = useMemo(
    () => participants.filter((p) => !p.pendingRound),
    [participants],
  )

  useEffect(() => {
    rememberLanguage(lang)
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    document.body.classList.add('tv-route')
    return () => document.body.classList.remove('tv-route')
  }, [])

  useEffect(() => {
    setRoomHandler((r) => setRoom(normalizePublicRoom(r)))
    return () => setRoomHandler(null)
  }, [])

  useEffect(() => {
    setRoomClosedHandler(() => {
      setRoom(null)
      setError(ui.lobbyClosed)
    })
    return () => setRoomClosedHandler(null)
  }, [ui.lobbyClosed])

  useEffect(() => subscribeConnection(setConn), [])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const session = loadSession()
      if (!session) {
        setBooting(false)
        return
      }
      try {
        const res = await rejoinGame(session.code, session.playerId)
        if (cancelled) return
        if (res.ok && res.room) {
          if (!res.room.youAreHost) {
            clearSession()
            setError(ui.tvHostOnly)
          } else {
            setRoom(normalizePublicRoom(res.room))
          }
        }
      } catch {
        if (!cancelled) setError(formatError('Kunde inte återansluta', lang))
      } finally {
        if (!cancelled) setBooting(false)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (conn !== 'connected') return
    void ensureSessionBound()
  }, [conn])

  async function act(fn: () => Promise<{ ok: boolean; error?: string; room?: PublicRoom }>) {
    setError(null)
    setBusy(true)
    try {
      const res = await fn()
      if (!res.ok) {
        setError(formatError(res.error, lang))
        return
      }
      if (res.room) setRoom(normalizePublicRoom(res.room))
    } catch (e) {
      setError(formatError(e instanceof Error ? e.message : undefined, lang))
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate() {
    if (!name.trim()) return setError(ui.errorName)
    setBusy(true)
    setError(null)
    try {
      const res = await createGame(name.trim())
      if (!res.ok) return setError(formatError(res.error, lang))
      saveSession({ code: res.room.code, playerId: res.playerId, name: name.trim() })
      setRoom(normalizePublicRoom(res.room))
    } catch (e) {
      setError(formatError(e instanceof Error ? e.message : undefined, lang) || ui.errorCreate)
    } finally {
      setBusy(false)
    }
  }

  async function handleCloseLobby() {
    if (!window.confirm(ui.closeLobbyConfirm)) return
    setError(null)
    setBusy(true)
    try {
      const res = await closeLobby()
      if (!res.ok) {
        setError(formatError(res.error, lang) || ui.errorCloseLobby)
        return
      }
      clearSession()
      setRoom(null)
    } catch (e) {
      setError(formatError(e instanceof Error ? e.message : undefined, lang) || ui.errorCloseLobby)
    } finally {
      setBusy(false)
    }
  }

  async function handleKick(playerId: string, playerName: string) {
    if (!window.confirm(fill(ui.kickConfirm, { name: playerName }))) return
    await act(() => removePlayer(playerId))
  }

  function TvShell({ children }: { children: ReactNode }) {
    return (
      <div className={`tv-app${fullscreen.active ? ' is-fullscreen' : ''}`}>
        {!fullscreen.active && showFullscreenPrompt && (
          <div className="tv-fullscreen-prompt">
            <p>{ui.tvFullscreenHint}</p>
            <div className="tv-fullscreen-prompt-actions">
              <button
                type="button"
                className="tv-btn primary"
                onClick={() => void fullscreen.enter().then((ok) => ok && setShowFullscreenPrompt(false))}
              >
                {ui.tvFullscreenOn}
              </button>
              <button
                type="button"
                className="tv-btn ghost"
                onClick={() => setShowFullscreenPrompt(false)}
              >
                {ui.tvFullscreenSkip}
              </button>
            </div>
          </div>
        )}
        <button
          type="button"
          className="tv-fullscreen-toggle"
          onClick={() => void fullscreen.toggle()}
          title={fullscreen.active ? 'Avsluta helskärm' : 'Helskärm'}
        >
          {fullscreen.active ? '⤢' : '⛶'}
        </button>
        {children}
      </div>
    )
  }

  if (booting) {
    return (
      <TvShell>
        <main className="tv-panel center">
          <h1 className="tv-title">{ui.tvBoot}</h1>
          <p className="tv-muted">{ui.connecting}</p>
        </main>
      </TvShell>
    )
  }

  if (!room) {
    return (
      <TvShell>
        <main className="tv-panel setup">
          <div className="tv-setup-top">
            <p className="tv-eyebrow">{ui.brand} · {ui.tvBoot}</p>
            <LanguageToggle lang={lang} onChange={setLang} label={ui.language} />
          </div>
          <h1 className="tv-title">{ui.tvSetupTitle}</h1>
          <p className="tv-lead">{ui.tvSetupLead}</p>
          {lang === 'en' && <p className="tv-muted">{ui.tvChallengesNote}</p>}
          <label className="tv-field">
            <span>{ui.yourName}</span>
            <input
              className="tv-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={ui.hostPlaceholder}
              autoFocus
            />
          </label>
          {error && <p className="tv-error">{error}</p>}
          <button type="button" className="tv-btn primary" disabled={busy} onClick={() => void handleCreate()}>
            {busy ? ui.creating : ui.createGame}
          </button>
          <a href="/" className="tv-link">
            {ui.tvMobile}
          </a>
          <SisterGames ui={ui} compact />
        </main>
      </TvShell>
    )
  }

  if (!room.youAreHost) {
    return (
      <TvShell>
        <main className="tv-panel center">
          <h1 className="tv-title">{ui.tvHostOnlyTitle}</h1>
          <p className="tv-muted">{error ?? ui.tvHostOnlyHint}</p>
          <a href="/" className="tv-btn secondary">
            {ui.goMobile}
          </a>
        </main>
      </TvShell>
    )
  }

  return (
    <TvShell>
      {conn !== 'connected' && (
        <div className="tv-conn">{conn === 'connecting' ? ui.connecting : ui.disconnected}</div>
      )}

      <header className="tv-header">
        <div className="tv-header-left">
          <span className="tv-code">{room.code}</span>
          {room.roundIndex > 0 && (
            <span className="tv-round">{roundLabel(room.roundIndex, room.maxRounds, ui)}</span>
          )}
          <LanguageToggle lang={lang} onChange={setLang} label={ui.language} />
        </div>
        <div className="tv-header-right">
          <TvScoreboard room={room} />
        </div>
      </header>

      {error && <p className="tv-error banner">{error}</p>}

      {room.status === 'lobby' && (
        <main className="tv-main lobby">
          <section className="tv-hero">
            <h1 className="tv-title">{fill(ui.tvWelcome, { name: room.hostName })}</h1>
            <p className="tv-lead">{ui.tvLead}</p>
            <p className="tv-code-huge">{room.code}</p>
            <JoinQr url={joinLink} alt={`QR ${room.code}`} />
          </section>
          <section className="tv-side">
            <h2>{ui.participantsTitle}</h2>
            <ul className="tv-players">
              {participants.length === 0 ? (
                <li className="empty">{ui.tvWaiting}</li>
              ) : (
                participants.map((p) => (
                  <li key={p.id} className={p.connected ? '' : 'away'}>
                    <span>
                      {p.name}
                      {!p.connected && ` · ${ui.away}`}
                      {p.pendingRound && ` · ${ui.pending}`}
                    </span>
                    {!p.pendingRound && (
                      <button
                        type="button"
                        className="tv-btn ghost small"
                        disabled={busy}
                        onClick={() => void handleKick(p.id, p.name)}
                      >
                        {ui.kick}
                      </button>
                    )}
                  </li>
                ))
              )}
            </ul>
            <p className="tv-muted">
              {fill(ui.requiredForStart, { n: room.participantCount, min: room.minParticipants })}
            </p>
            <RoundSelector
              maxRounds={room.maxRounds}
              disabled={busy}
              variant="tv"
              ui={ui}
              onChange={(maxRounds) => setRoom((r) => (r ? { ...r, maxRounds } : r))}
              onError={(msg) => setError(formatError(msg, lang))}
            />
            <button
              type="button"
              className="tv-btn primary large"
              disabled={busy || room.participantCount < room.minParticipants}
              onClick={() => act(startGame)}
            >
              {ui.startFirst}
            </button>
            <button
              type="button"
              className="tv-btn ghost"
              disabled={busy}
              onClick={() => void handleCloseLobby()}
            >
              {ui.closeLobby}
            </button>
            <SisterGames ui={ui} compact />
          </section>
        </main>
      )}

      {room.status === 'challenge' && room.challenge && (
        <main className="tv-main challenge">
          <div className="tv-challenge-meta">
            <span className="tv-type">{typeLabel(room.challenge.type, ui)}</span>
            {countdown != null && countdown > 0 && (
              <span className="tv-timer">{formatTime(countdown)}</span>
            )}
          </div>
          <h1 className="tv-challenge-title">{room.challenge.title}</h1>
          <p className="tv-challenge-text">{room.challenge.description}</p>
          <div className="tv-challenge-footer">
            <div className="tv-status-grid">
              {activeParticipants.map((p) => {
                const done = room.submissions.some((s) => s.playerId === p.id)
                return (
                  <div key={p.id} className={`tv-status-card${done ? ' done' : ''}`}>
                    <span className="name">{p.name}</span>
                    <span className="state">{done ? ui.tvDone : ui.tvWaitingSubmit}</span>
                  </div>
                )
              })}
            </div>
            <p className="tv-muted">
              {fill(ui.readyShort, { done: room.submittedCount, total: room.participantCount })}
            </p>
            <button type="button" className="tv-btn accent large" disabled={busy} onClick={() => act(endChallenge)}>
              {ui.stopJudge}
            </button>
          </div>
        </main>
      )}

      {room.status === 'judging' && (
        <main className="tv-main judging">
          <h1 className="tv-section-title">{ui.judgeTitle}</h1>
          <p className="tv-muted">{ui.judgeHint}</p>
          <div className="tv-judge-grid">
            {activeParticipants.map((p) => {
              const sub = room.submissions.find((s) => s.playerId === p.id)
              const given = hostScores[p.id]
              return (
                <article key={p.id} className={`tv-judge-card${given != null ? ' scored' : ''}`}>
                  <div className="tv-judge-card-head">
                    <h2>{p.name}</h2>
                    {given != null && <span className="tv-score-given">{fill(ui.youGave, { n: given })}</span>}
                  </div>
                  {sub?.payload.startsWith('data:image') ? (
                    <img src={sub.payload} alt={p.name} className="tv-submission-img" />
                  ) : sub?.payload === 'ready' ? (
                    <p className="tv-muted">{ui.physicalJudge}</p>
                  ) : sub ? (
                    <p className="tv-submission-text">{sub.payload}</p>
                  ) : (
                    <p className="tv-muted">{ui.noSubmission}</p>
                  )}
                  <div className="tv-score-row">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`tv-score-btn${given === n ? ' selected' : ''}`}
                        disabled={busy}
                        onClick={() =>
                          act(async () => {
                            const res = await scorePlayer(p.id, n)
                            if (res.ok) recordScore(p.id, n)
                            return res
                          })
                        }
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        </main>
      )}

      {room.status === 'scores' && (
        <main className="tv-main scores">
          <h1 className="tv-section-title">{fill(ui.scoresAfter, { n: room.roundIndex })}</h1>
          {room.roundScores && (
            <ul className="tv-round-scores">
              {room.roundScores.map((r) => (
                <li key={r.playerId}>
                  <span>{r.name}</span>
                  <strong>{r.points} p</strong>
                </li>
              ))}
            </ul>
          )}
          <h2 className="tv-subtitle">{ui.total}</h2>
          <TvScoreboard room={room} />
          <div className="tv-actions">
            {room.maxRounds === 0 || room.roundIndex < room.maxRounds ? (
              <button type="button" className="tv-btn primary large" disabled={busy} onClick={() => act(nextRound)}>
                {ui.nextTest}
              </button>
            ) : null}
            <button type="button" className="tv-btn ghost" disabled={busy} onClick={() => act(endGame)}>
              {ui.endGame}
            </button>
          </div>
        </main>
      )}

      {room.status === 'finished' && (
        <main className="tv-main scores">
          <h1 className="tv-section-title">{ui.gameOver}</h1>
          <WinnerReveal room={room} ui={ui} tv />
          <button type="button" className="tv-btn primary large" disabled={busy} onClick={() => act(backToLobby)}>
            {ui.backToLobby}
          </button>
        </main>
      )}
    </TvShell>
  )
}
