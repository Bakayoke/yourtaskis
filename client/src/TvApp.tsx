import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useFullscreen } from './useFullscreen'
import { useHostScores } from './useHostScores'
import {
  backToLobby,
  clearSession,
  createGame,
  endChallenge,
  endGame,
  ensureSessionBound,
  joinUrl,
  loadSession,
  nextRound,
  rejoinGame,
  saveSession,
  scorePlayer,
  setRoomHandler,
  startGame,
  subscribeConnection,
  type ConnState,
} from './api'
import { JoinQr } from './qr'
import { RoundSelector, roundLabel } from './RoundSelector'
import { normalizePublicRoom } from './roomUtils'
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

const TYPE_LABELS: Record<string, string> = {
  speed: 'Snabbhet',
  creative: 'Kreativt',
  subjective: 'Bedömning',
  endurance: 'Uthållighet',
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

  const participants = useMemo(
    () => room?.players.filter((p) => p.id !== room.hostId) ?? [],
    [room],
  )

  useEffect(() => {
    document.body.classList.add('tv-route')
    return () => document.body.classList.remove('tv-route')
  }, [])

  useEffect(() => {
    setRoomHandler((r) => setRoom(normalizePublicRoom(r)))
    return () => setRoomHandler(null)
  }, [])

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
            setError('TV-läge är bara för testledaren. Använd mobilvyn som deltagare.')
          } else {
            setRoom(normalizePublicRoom(res.room))
          }
        }
      } catch {
        if (!cancelled) setError('Kunde inte återansluta.')
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
        setError(res.error ?? 'Något gick fel')
        return
      }
      if (res.room) setRoom(normalizePublicRoom(res.room))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate() {
    if (!name.trim()) return setError('Ange ditt namn')
    setBusy(true)
    setError(null)
    try {
      const res = await createGame(name.trim())
      if (!res.ok) return setError(res.error)
      saveSession({ code: res.room.code, playerId: res.playerId, name: name.trim() })
      setRoom(normalizePublicRoom(res.room))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte skapa spel')
    } finally {
      setBusy(false)
    }
  }

  function TvShell({ children }: { children: ReactNode }) {
    return (
      <div className={`tv-app${fullscreen.active ? ' is-fullscreen' : ''}`}>
        {!fullscreen.active && showFullscreenPrompt && (
          <div className="tv-fullscreen-prompt">
            <p>TV-läge är bäst i helskärm på stor skärm.</p>
            <div className="tv-fullscreen-prompt-actions">
              <button
                type="button"
                className="tv-btn primary"
                onClick={() => void fullscreen.enter().then((ok) => ok && setShowFullscreenPrompt(false))}
              >
                Aktivera helskärm
              </button>
              <button
                type="button"
                className="tv-btn ghost"
                onClick={() => setShowFullscreenPrompt(false)}
              >
                Hoppa över
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
          <h1 className="tv-title">TV-läge</h1>
          <p className="tv-muted">Ansluter…</p>
        </main>
      </TvShell>
    )
  }

  if (!room) {
    return (
      <TvShell>
        <main className="tv-panel setup">
          <p className="tv-eyebrow">yourtaskis.com · TV-läge</p>
          <h1 className="tv-title">Testledare på stor skärm</h1>
          <p className="tv-lead">
            Skapa ett spel här på TV:n. Deltagarna ansluter via mobil med koden som visas.
          </p>
          <label className="tv-field">
            <span>Ditt namn</span>
            <input
              className="tv-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Testledaren"
              autoFocus
            />
          </label>
          {error && <p className="tv-error">{error}</p>}
          <button type="button" className="tv-btn primary" disabled={busy} onClick={() => void handleCreate()}>
            {busy ? 'Skapar…' : 'Skapa spel'}
          </button>
          <a href="/" className="tv-link">
            ← Till mobilvyn
          </a>
        </main>
      </TvShell>
    )
  }

  if (!room.youAreHost) {
    return (
      <TvShell>
        <main className="tv-panel center">
          <h1 className="tv-title">Endast testledare</h1>
          <p className="tv-muted">{error ?? 'TV-läge kräver att du är testledare.'}</p>
          <a href="/" className="tv-btn secondary">
            Gå till mobilvyn
          </a>
        </main>
      </TvShell>
    )
  }

  return (
    <TvShell>
      {conn !== 'connected' && (
        <div className="tv-conn">{conn === 'connecting' ? 'Ansluter…' : 'Frånkopplad'}</div>
      )}

      <header className="tv-header">
        <div className="tv-header-left">
          <span className="tv-code">{room.code}</span>
          {room.roundIndex > 0 && (
            <span className="tv-round">{roundLabel(room.roundIndex, room.maxRounds)}</span>
          )}
        </div>
        <div className="tv-header-right">
          <TvScoreboard room={room} />
        </div>
      </header>

      {error && <p className="tv-error banner">{error}</p>}

      {room.status === 'lobby' && (
        <main className="tv-main lobby">
          <section className="tv-hero">
            <h1 className="tv-title">Välkommen, {room.hostName}</h1>
            <p className="tv-lead">Deltagarna skannar QR-koden eller går till yourtaskis.com</p>
            <p className="tv-code-huge">{room.code}</p>
            <JoinQr url={joinLink} alt={`QR för kod ${room.code}`} />
          </section>
          <section className="tv-side">
            <h2>Deltagare</h2>
            <ul className="tv-players">
              {participants.length === 0 ? (
                <li className="empty">Väntar på deltagare…</li>
              ) : (
                participants.map((p) => (
                  <li key={p.id} className={p.connected ? '' : 'away'}>
                    {p.name}
                    {!p.connected && ' · borta'}
                  </li>
                ))
              )}
            </ul>
            <p className="tv-muted">
              {room.participantCount}/{room.minParticipants} krävs för start
            </p>
            <RoundSelector
              maxRounds={room.maxRounds}
              disabled={busy}
              variant="tv"
              onChange={(maxRounds) => setRoom((r) => (r ? { ...r, maxRounds } : r))}
              onError={setError}
            />
            <button
              type="button"
              className="tv-btn primary large"
              disabled={busy || room.participantCount < room.minParticipants}
              onClick={() => act(startGame)}
            >
              Starta första testet
            </button>
          </section>
        </main>
      )}

      {room.status === 'challenge' && room.challenge && (
        <main className="tv-main challenge">
          <div className="tv-challenge-meta">
            <span className="tv-type">{TYPE_LABELS[room.challenge.type] ?? room.challenge.type}</span>
            {countdown != null && countdown > 0 && (
              <span className="tv-timer">{formatTime(countdown)}</span>
            )}
          </div>
          <h1 className="tv-challenge-title">{room.challenge.title}</h1>
          <p className="tv-challenge-text">{room.challenge.description}</p>
          <div className="tv-challenge-footer">
            <div className="tv-status-grid">
              {participants.map((p) => {
                const done = room.submissions.some((s) => s.playerId === p.id)
                return (
                  <div key={p.id} className={`tv-status-card${done ? ' done' : ''}`}>
                    <span className="name">{p.name}</span>
                    <span className="state">{done ? '✓ Klar' : '…'}</span>
                  </div>
                )
              })}
            </div>
            <p className="tv-muted">
              {room.submittedCount}/{room.participantCount} klara
            </p>
            <button type="button" className="tv-btn accent large" disabled={busy} onClick={() => act(endChallenge)}>
              Stopp — bedöm nu
            </button>
          </div>
        </main>
      )}

      {room.status === 'judging' && (
        <main className="tv-main judging">
          <h1 className="tv-section-title">Bedöm deltagarna</h1>
          <p className="tv-muted">Ge 1–5 poäng per person</p>
          <div className="tv-judge-grid">
            {participants.map((p) => {
              const sub = room.submissions.find((s) => s.playerId === p.id)
              const given = hostScores[p.id]
              return (
                <article key={p.id} className={`tv-judge-card${given != null ? ' scored' : ''}`}>
                  <div className="tv-judge-card-head">
                    <h2>{p.name}</h2>
                    {given != null && <span className="tv-score-given">Du gav: {given} poäng</span>}
                  </div>
                  {sub?.payload.startsWith('data:image') ? (
                    <img src={sub.payload} alt={`Teckning av ${p.name}`} className="tv-submission-img" />
                  ) : sub?.payload === 'ready' ? (
                    <p className="tv-muted">Fysiskt test — bedöm utifrån vad du såg.</p>
                  ) : sub ? (
                    <p className="tv-submission-text">{sub.payload}</p>
                  ) : (
                    <p className="tv-muted">Ingen inlämning</p>
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
          <h1 className="tv-section-title">Poäng — runda {room.roundIndex}</h1>
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
          <h2 className="tv-subtitle">Totalt</h2>
          <TvScoreboard room={room} />
          <div className="tv-actions">
            {room.maxRounds === 0 || room.roundIndex < room.maxRounds ? (
              <button type="button" className="tv-btn primary large" disabled={busy} onClick={() => act(nextRound)}>
                Nästa test
              </button>
            ) : null}
            <button type="button" className="tv-btn ghost" disabled={busy} onClick={() => act(endGame)}>
              Avsluta spelet
            </button>
          </div>
        </main>
      )}

      {room.status === 'finished' && (
        <main className="tv-main scores">
          <h1 className="tv-section-title">Spelet är slut!</h1>
          <TvScoreboard room={room} />
          <button type="button" className="tv-btn primary large" disabled={busy} onClick={() => act(backToLobby)}>
            Tillbaka till lobby
          </button>
        </main>
      )}
    </TvShell>
  )
}
