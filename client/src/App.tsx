import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DrawCanvas } from './DrawCanvas'
import { useHostScores } from './useHostScores'
import { WinnerReveal } from './WinnerReveal'
import { SisterGames } from './SisterGames'
import { LanguageToggle } from './LanguageToggle'
import { PendingRoundBanner, ReconnectBanner } from './ReconnectBanner'
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
  fetchHealth,
  fetchRoomPreview,
  joinGame,
  joinUrl,
  tvUrl,
  loadSession,
  nextRound,
  removePlayer,
  rejoinGame,
  saveSession,
  scorePlayer,
  setRoomHandler,
  setRoomClosedHandler,
  setKickedHandler,
  startGame,
  submitResponse,
  subscribeConnection,
  type ConnState,
  type RoomPreview,
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
  const left = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null
  return left
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <main className="panel card">
          <h2>Något gick fel</h2>
          <p className="muted">{this.state.error.message}</p>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              clearSession()
              window.location.reload()
            }}
          >
            Rensa och ladda om
          </button>
        </main>
      )
    }
    return this.props.children
  }
}

function ConnBadge({ conn, ui }: { conn: ConnState; ui: ReturnType<typeof t> }) {
  if (conn === 'connected') return null
  return (
    <div className={`conn-badge ${conn}`}>
      {conn === 'connecting' ? ui.connecting : ui.disconnected}
    </div>
  )
}

function Scoreboard({ room }: { room: PublicRoom }) {
  return (
    <ol className="scoreboard">
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

export default function App() {
  const [lang, setLang] = useState<Lang>(() => loadLanguage())
  const ui = t(lang)
  const [screen, setScreen] = useState<'home' | 'create' | 'join' | 'play'>('home')
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinStep, setJoinStep] = useState<'code' | 'name'>('code')
  const [joinPreview, setJoinPreview] = useState<RoomPreview | null>(null)
  const [room, setRoom] = useState<PublicRoom | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [conn, setConn] = useState<ConnState>('connecting')
  const [textDraft, setTextDraft] = useState('')
  const [drawDraft, setDrawDraft] = useState('')
  const [banner, setBanner] = useState<string | null>(null)
  const [savedSession] = useState(() => loadSession())
  const { scores: hostScores, recordScore } = useHostScores(room)

  const countdown = useCountdown(room?.phaseEndsAt ?? 0)
  const stableDrawChange = useCallback((data: string) => setDrawDraft(data), [])

  useEffect(() => {
    rememberLanguage(lang)
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('join')
    if (code) {
      setJoinCode(code.toUpperCase())
      setScreen('join')
    }
  }, [])

  useEffect(() => {
    void fetchHealth()
      .then((h) => {
        if (h.persist && !h.persist.configured) {
          setBanner(ui.redisWarning)
        }
      })
      .catch(() => null)
  }, [ui.redisWarning])

  useEffect(() => {
    setRoomHandler((r) => setRoom(normalizePublicRoom(r)))
    return () => setRoomHandler(null)
  }, [])

  useEffect(() => {
    setRoomClosedHandler(() => {
      setRoom(null)
      setScreen('home')
      setError(ui.lobbyClosed)
    })
    return () => setRoomClosedHandler(null)
  }, [ui.lobbyClosed])

  useEffect(() => {
    setKickedHandler(() => {
      setRoom(null)
      setScreen('home')
      setError(ui.youWereKicked)
    })
    return () => setKickedHandler(null)
  }, [ui.youWereKicked])

  useEffect(() => subscribeConnection(setConn), [])

  useEffect(() => {
    if (conn !== 'connected' || screen !== 'play') return
    const session = loadSession()
    if (!session) return
    void ensureSessionBound()
  }, [conn, screen])

  useEffect(() => {
    if (room?.status === 'challenge') {
      setTextDraft('')
      setDrawDraft('')
    }
  }, [room?.status, room?.roundIndex])

  const joinLink = useMemo(() => (room ? joinUrl(room.code) : ''), [room])

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
      setScreen('play')
    } catch (e) {
      setError(formatError(e instanceof Error ? e.message : undefined, lang) || ui.errorCreate)
    } finally {
      setBusy(false)
    }
  }

  async function lookupJoinCode() {
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 4) return setError(ui.errorCode)
    setBusy(true)
    setError(null)
    try {
      const preview = await fetchRoomPreview(code)
      setJoinPreview(preview)
      setJoinStep('name')
    } catch (e) {
      setError(formatError(e instanceof Error ? e.message : undefined, lang) || ui.errorLookup)
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin() {
    if (!name.trim()) return setError(ui.errorName)
    setBusy(true)
    setError(null)
    try {
      const res = await joinGame(joinCode.trim().toUpperCase(), name.trim())
      if (!res.ok) return setError(formatError(res.error, lang))
      saveSession({ code: res.room.code, playerId: res.playerId, name: name.trim() })
      setRoom(normalizePublicRoom(res.room))
      setScreen('play')
    } catch (e) {
      setError(formatError(e instanceof Error ? e.message : undefined, lang) || ui.errorJoin)
    } finally {
      setBusy(false)
    }
  }

  async function handleKick(playerId: string, playerName: string) {
    if (!window.confirm(fill(ui.kickConfirm, { name: playerName }))) return
    await act(() => removePlayer(playerId))
  }

  function leaveGame() {
    clearSession()
    setRoom(null)
    setScreen('home')
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
      setScreen('home')
    } catch (e) {
      setError(formatError(e instanceof Error ? e.message : undefined, lang) || ui.errorCloseLobby)
    } finally {
      setBusy(false)
    }
  }

  function resetToHome() {
    clearSession()
    setRoom(null)
    setScreen('home')
    setError(null)
  }

  async function resumeSession() {
    const session = loadSession()
    if (!session) return
    setBusy(true)
    setError(null)
    try {
      const res = await rejoinGame(session.code, session.playerId)
      if (res.ok && res.room) {
        setRoom(normalizePublicRoom(res.room))
        setScreen('play')
      } else {
        clearSession()
        setError(ui.errorResume)
        setScreen('home')
      }
    } catch (e) {
      clearSession()
      setError(formatError(e instanceof Error ? e.message : undefined, lang) || ui.errorResume)
      setScreen('home')
    } finally {
      setBusy(false)
    }
  }

  function copyCode() {
    if (!room) return
    void navigator.clipboard.writeText(room.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const hostLayout = room?.youAreHost

  return (
    <ErrorBoundary>
    <div className={`app${hostLayout ? ' host' : ''}`}>
      <div className="content-layer">
      <ConnBadge conn={conn} ui={ui} />
      {banner && <div className="banner">{banner}</div>}

      {screen === 'home' && (
        <main className="panel">
          <div className="panel-top">
            <p className="eyebrow">{ui.brand}</p>
            <LanguageToggle lang={lang} onChange={setLang} label={ui.language} />
          </div>
          <h1>
            Your Task
            <span> Is…</span>
          </h1>
          <p className="lead">{ui.tagline}</p>
          {lang === 'en' && <p className="muted">{ui.challengesSwedish}</p>}
          <div className="stack">
            <button type="button" className="btn primary" onClick={() => setScreen('create')}>
              {ui.hostCta}
            </button>
            <button type="button" className="btn secondary" onClick={() => setScreen('join')}>
              {ui.joinCta}
            </button>
            {savedSession && (
              <button type="button" className="btn ghost" disabled={busy} onClick={() => void resumeSession()}>
                {ui.resumeAs} {savedSession.name}
              </button>
            )}
          </div>
          <SisterGames ui={ui} />
        </main>
      )}

      {screen === 'create' && (
        <main className="panel">
          <button type="button" className="btn link" onClick={() => setScreen('home')}>
            ← {ui.back}
          </button>
          <h2>{ui.createGame}</h2>
          <p className="muted">{ui.hostHint}</p>
          <label className="field">
            <span>{ui.yourName}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={ui.hostPlaceholder}
              autoFocus
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="button" className="btn primary" disabled={busy} onClick={() => void handleCreate()}>
            {busy ? ui.creating : ui.createRoom}
          </button>
        </main>
      )}

      {screen === 'join' && (
        <main className="panel">
          <button
            type="button"
            className="btn link"
            onClick={() => {
              setScreen('home')
              setJoinStep('code')
              setJoinPreview(null)
            }}
          >
            ← {ui.back}
          </button>
          <h2>{ui.joinTitle}</h2>
          {joinStep === 'code' ? (
            <>
              <label className="field">
                <span>{ui.roomCode}</span>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABCD"
                  maxLength={4}
                  autoFocus
                />
              </label>
              {error && <p className="error">{error}</p>}
              <button type="button" className="btn primary" disabled={busy} onClick={() => void lookupJoinCode()}>
                {busy ? ui.searching : ui.continueBtn}
              </button>
            </>
          ) : (
            <>
              <p className="muted">
                {ui.joinPreview} <strong>{joinPreview?.hostName}</strong> ·{' '}
                <strong>{joinCode.toUpperCase()}</strong>
              </p>
              <label className="field">
                <span>{ui.yourName}</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={ui.participantPlaceholder}
                  autoFocus
                />
              </label>
              {error && <p className="error">{error}</p>}
              <button type="button" className="btn primary" disabled={busy} onClick={() => void handleJoin()}>
                {busy ? ui.joining : ui.joinBtn}
              </button>
            </>
          )}
        </main>
      )}

      {screen === 'play' && !room && (
        <main className="panel card">
          <h2>{ui.reconnectScreen}</h2>
          <p className="muted">
            {conn === 'connected' ? ui.reconnectNoSession : ui.reconnectWait}
          </p>
          <button type="button" className="btn primary" onClick={resetToHome}>
            {ui.home}
          </button>
        </main>
      )}

      {screen === 'play' && room && (
        <main className="panel play">
          <header className="play-header">
            <div>
              <span className="code-pill">{room.code}</span>
              {room.roundIndex > 0 && (
                <span className="round-pill">{roundLabel(room.roundIndex, room.maxRounds, ui)}</span>
              )}
            </div>
            <div className="play-header-actions">
              <LanguageToggle lang={lang} onChange={setLang} label={ui.language} />
              <button type="button" className="btn link small" onClick={leaveGame}>
                {ui.leave}
              </button>
            </div>
          </header>

          <ReconnectBanner
            conn={conn}
            room={room}
            ui={ui}
            onReconnected={() => {
              const session = loadSession()
              if (session) void rejoinGame(session.code, session.playerId).then((res) => {
                if (res.ok && res.room) setRoom(normalizePublicRoom(res.room))
              })
            }}
          />
          <PendingRoundBanner room={room} ui={ui} />

          {error && <p className="error">{error}</p>}

          {room.status === 'lobby' && (
            <section className="card">
              <h2>{ui.lobby}</h2>
              {room.youAreHost ? (
                <>
                  <p className="lead">{ui.lobbyHostLead}</p>
                  <div className="join-block">
                    <button type="button" className="code-big" onClick={copyCode}>
                      {room.code}
                    </button>
                    <p className="muted">{copied ? ui.copied : ui.copyHint}</p>
                    <JoinQr url={joinLink} alt={`QR ${room.code}`} />
                  </div>
                  <ul className="player-list">
                    <li className="host">
                      {room.hostName} <em>{ui.hostLabel}</em>
                    </li>
                    {room.players
                      .filter((p) => p.id !== room.hostId)
                      .map((p) => (
                        <li key={p.id} className={p.connected ? '' : 'away'}>
                          <span>
                            {p.name}
                            {!p.connected && ` (${ui.away})`}
                            {p.pendingRound && ` · ${ui.pending}`}
                          </span>
                          <button
                            type="button"
                            className="btn link small kick-btn"
                            disabled={busy}
                            onClick={() => void handleKick(p.id, p.name)}
                          >
                            {ui.kick}
                          </button>
                        </li>
                      ))}
                  </ul>
                  <p className="muted">
                    {room.participantCount}/{room.minParticipants} {ui.participants}
                  </p>
                  <RoundSelector
                    maxRounds={room.maxRounds}
                    disabled={busy}
                    ui={ui}
                    onChange={(maxRounds) => setRoom((r) => (r ? { ...r, maxRounds } : r))}
                    onError={(msg) => setError(formatError(msg, lang))}
                  />
                  <div className="stack">
                    <button
                      type="button"
                      className="btn primary"
                      disabled={busy || room.participantCount < room.minParticipants}
                      onClick={() => act(startGame)}
                    >
                      {ui.startFirst}
                    </button>
                    <a href={tvUrl(room.code)} className="btn secondary tv-link-btn" target="_blank" rel="noopener noreferrer">
                      {ui.openTv}
                    </a>
                    <button
                      type="button"
                      className="btn ghost"
                      disabled={busy}
                      onClick={() => void handleCloseLobby()}
                    >
                      {ui.closeLobby}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="lead">{fill(ui.waitingHost, { name: room.hostName })}</p>
                  {room.maxRounds === 0 ? (
                    <p className="muted">{ui.roundsUnlimited}</p>
                  ) : (
                    <p className="muted">{fill(ui.roundsPlanned, { n: room.maxRounds })}</p>
                  )}
                  <ul className="player-list">
                    {room.players.map((p) => (
                      <li key={p.id} className={p.id === room.hostId ? 'host' : ''}>
                        {p.name}
                        {p.id === room.hostId && ` · ${ui.hostLabel}`}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          {room.status === 'challenge' && room.challenge && !room.youPendingRound && (
            <section className="card challenge-card">
              <p className="eyebrow">{room.challenge.type}</p>
              <h2>{room.challenge.title}</h2>
              <p className="challenge-text">{room.challenge.description}</p>
              {countdown != null && countdown > 0 && (
                <div className="timer">{formatTime(countdown)}</div>
              )}
              {countdown === 0 && room.challenge.timeLimitSeconds != null && (
                <p className="muted">{ui.timeUp}</p>
              )}

              {room.youAreHost ? (
                <div className="host-actions">
                  <p className="muted">
                    {fill(ui.readyCount, {
                      done: room.submittedCount,
                      total: room.participantCount,
                    })}
                  </p>
                  <button type="button" className="btn primary" disabled={busy} onClick={() => act(endChallenge)}>
                    {ui.stopJudge}
                  </button>
                </div>
              ) : room.youSubmitted ? (
                <p className="ok-msg">{ui.submitted}</p>
              ) : (
                <div className="submit-area">
                  {room.challenge.submissionMode === 'draw' && (
                    <>
                      <DrawCanvas onChange={stableDrawChange} />
                      <button
                        type="button"
                        className="btn primary"
                        disabled={busy}
                        onClick={() => act(() => submitResponse(drawDraft))}
                      >
                        {ui.submitDraw}
                      </button>
                    </>
                  )}
                  {room.challenge.submissionMode === 'text' && (
                    <>
                      <textarea
                        value={textDraft}
                        onChange={(e) => setTextDraft(e.target.value)}
                        placeholder={ui.textPlaceholder}
                        rows={4}
                      />
                      <button
                        type="button"
                        className="btn primary"
                        disabled={busy || !textDraft.trim()}
                        onClick={() => act(() => submitResponse(textDraft))}
                      >
                        {ui.submitText}
                      </button>
                    </>
                  )}
                  {room.challenge.submissionMode === 'physical' && (
                    <>
                      <p className="muted">{ui.physicalHint}</p>
                      <button
                        type="button"
                        className="btn primary"
                        disabled={busy}
                        onClick={() => act(() => submitResponse('ready'))}
                      >
                        {ui.imReady}
                      </button>
                    </>
                  )}
                </div>
              )}
            </section>
          )}

          {room.status === 'judging' && room.youAreHost && (
            <section className="card">
              <h2>{ui.judgeTitle}</h2>
              <p className="muted">{ui.judgeHint}</p>
              <div className="judge-grid">
                {room.players
                  .filter((p) => p.id !== room.hostId && !p.pendingRound)
                  .map((p) => {
                    const sub = room.submissions.find((s) => s.playerId === p.id)
                    const given = hostScores[p.id]
                    return (
                      <article key={p.id} className={`judge-card${given != null ? ' scored' : ''}`}>
                        <div className="judge-card-head">
                          <h3>{p.name}</h3>
                          {given != null && (
                            <span className="score-given">{fill(ui.youGave, { n: given })}</span>
                          )}
                        </div>
                        {sub?.payload.startsWith('data:image') ? (
                          <img src={sub.payload} alt={p.name} className="submission-img" />
                        ) : sub?.payload === 'ready' ? (
                          <p className="muted">{ui.physicalJudge}</p>
                        ) : sub ? (
                          <p className="submission-text">{sub.payload}</p>
                        ) : (
                          <p className="muted">{ui.noSubmission}</p>
                        )}
                        <div className="score-row">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              className={`score-btn${given === n ? ' selected' : ''}`}
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
            </section>
          )}

          {room.status === 'judging' && !room.youAreHost && (
            <section className="card center">
              <h2>{ui.judging}</h2>
              <p className="muted">{fill(ui.judgingWait, { name: room.hostName })}</p>
            </section>
          )}

          {room.status === 'scores' && (
            <section className="card">
              <h2>{fill(ui.scoresAfter, { n: room.roundIndex })}</h2>
              {room.roundScores && (
                <ul className="round-scores">
                  {room.roundScores.map((r) => (
                    <li key={r.playerId}>
                      {r.name}: <strong>{r.points}</strong> {ui.points}
                    </li>
                  ))}
                </ul>
              )}
              <h3>{ui.total}</h3>
              <Scoreboard room={room} />
              {room.youAreHost && (
                <div className="stack">
                  {room.maxRounds > 0 && room.roundIndex >= room.maxRounds ? null : (
                    <button type="button" className="btn primary" disabled={busy} onClick={() => act(nextRound)}>
                      {ui.nextTest}
                    </button>
                  )}
                  <button type="button" className="btn ghost" disabled={busy} onClick={() => act(endGame)}>
                    {ui.endGame}
                  </button>
                </div>
              )}
            </section>
          )}

          {room.status === 'finished' && (
            <section className="card">
              <h2>{ui.gameOver}</h2>
              <WinnerReveal room={room} ui={ui} />
              {room.youAreHost ? (
                <button type="button" className="btn primary" disabled={busy} onClick={() => act(backToLobby)}>
                  {ui.backToLobby}
                </button>
              ) : (
                <p className="muted">{ui.thanks}</p>
              )}
            </section>
          )}
          <SisterGames ui={ui} compact />
        </main>
      )}
      </div>
    </div>
    </ErrorBoundary>
  )
}
