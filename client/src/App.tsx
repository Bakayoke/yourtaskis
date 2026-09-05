import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DrawCanvas } from './DrawCanvas'
import { useHostScores } from './useHostScores'
import {
  backToLobby,
  clearSession,
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
  rejoinGame,
  saveSession,
  scorePlayer,
  setRoomHandler,
  startGame,
  submitResponse,
  subscribeConnection,
  type ConnState,
  type RoomPreview,
} from './api'
import { JoinQr } from './qr'
import { RoundSelector, roundLabel } from './RoundSelector'
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

function ConnBadge({ conn }: { conn: ConnState }) {
  if (conn === 'connected') return null
  return (
    <div className={`conn-badge ${conn}`}>
      {conn === 'connecting' ? 'Ansluter…' : 'Frånkopplad — försöker igen'}
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
          setBanner('Servern saknar Redis — rum försvinner vid omstart.')
        }
      })
      .catch(() => null)
  }, [])

  useEffect(() => {
    setRoomHandler((r) => setRoom(r))
    return () => setRoomHandler(null)
  }, [])

  useEffect(() => subscribeConnection(setConn), [])

  useEffect(() => {
    if (conn !== 'connected' || screen !== 'play' || !room) return
    const session = loadSession()
    if (!session || session.code !== room.code) return
    void ensureSessionBound()
  }, [conn, screen, room])

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
        setError(res.error ?? 'Något gick fel')
        return
      }
      if (res.room) setRoom(res.room)
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
      setRoom(res.room)
      setScreen('play')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte skapa spel')
    } finally {
      setBusy(false)
    }
  }

  async function lookupJoinCode() {
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 4) return setError('Koden är fyra bokstäver')
    setBusy(true)
    setError(null)
    try {
      const preview = await fetchRoomPreview(code)
      setJoinPreview(preview)
      setJoinStep('name')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hittade inget spel')
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin() {
    if (!name.trim()) return setError('Ange ditt namn')
    setBusy(true)
    setError(null)
    try {
      const res = await joinGame(joinCode.trim().toUpperCase(), name.trim())
      if (!res.ok) return setError(res.error)
      saveSession({ code: res.room.code, playerId: res.playerId, name: name.trim() })
      setRoom(res.room)
      setScreen('play')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte gå med')
    } finally {
      setBusy(false)
    }
  }

  function leaveGame() {
    clearSession()
    setRoom(null)
    setScreen('home')
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
        setRoom(res.room)
        setScreen('play')
      } else {
        clearSession()
        setError('Kunde inte återansluta — starta ett nytt spel.')
        setScreen('home')
      }
    } catch (e) {
      clearSession()
      setError(e instanceof Error ? e.message : 'Kunde inte återansluta')
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
      <ConnBadge conn={conn} />
      {banner && <div className="banner">{banner}</div>}

      {screen === 'home' && (
        <main className="panel">
          <p className="eyebrow">yourtaskis.com</p>
          <h1>
            Your Task
            <span> Is…</span>
          </h1>
          <p className="lead">
            Hemma-Bäst-i-Test. En testledare, resten utför. Domaren ger poäng 1–5. Minst tre
            personer.
          </p>
          <div className="stack">
            <button type="button" className="btn primary" onClick={() => setScreen('create')}>
              Jag är testledare
            </button>
            <button type="button" className="btn secondary" onClick={() => setScreen('join')}>
              Gå med som deltagare
            </button>
            {savedSession && (
              <button type="button" className="btn ghost" disabled={busy} onClick={() => void resumeSession()}>
                Fortsätt som {savedSession.name}
              </button>
            )}
          </div>
        </main>
      )}

      {screen === 'create' && (
        <main className="panel">
          <button type="button" className="btn link" onClick={() => setScreen('home')}>
            ← Tillbaka
          </button>
          <h2>Skapa spel</h2>
          <p className="muted">Du blir testledare och bedömer varje test.</p>
          <label className="field">
            <span>Ditt namn</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Testledaren"
              autoFocus
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="button" className="btn primary" disabled={busy} onClick={() => void handleCreate()}>
            {busy ? 'Skapar…' : 'Skapa rum'}
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
            ← Tillbaka
          </button>
          <h2>Gå med</h2>
          {joinStep === 'code' ? (
            <>
              <label className="field">
                <span>Sessionskod</span>
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
                {busy ? 'Söker…' : 'Fortsätt'}
              </button>
            </>
          ) : (
            <>
              <p className="muted">
                Går med hos <strong>{joinPreview?.hostName}</strong> · kod{' '}
                <strong>{joinCode.toUpperCase()}</strong>
              </p>
              <label className="field">
                <span>Ditt namn</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Deltagare"
                  autoFocus
                />
              </label>
              {error && <p className="error">{error}</p>}
              <button type="button" className="btn primary" disabled={busy} onClick={() => void handleJoin()}>
                {busy ? 'Ansluter…' : 'Gå med'}
              </button>
            </>
          )}
        </main>
      )}

      {screen === 'play' && !room && (
        <main className="panel card">
          <h2>Återansluter…</h2>
          <p className="muted">
            {conn === 'connected'
              ? 'Kunde inte hitta din sparade session.'
              : 'Väntar på anslutning till servern…'}
          </p>
          <button type="button" className="btn primary" onClick={resetToHome}>
            Till startsidan
          </button>
        </main>
      )}

      {screen === 'play' && room && (
        <main className="panel play">
          <header className="play-header">
            <div>
              <span className="code-pill">{room.code}</span>
              {room.roundIndex > 0 && (
                <span className="round-pill">{roundLabel(room.roundIndex, room.maxRounds)}</span>
              )}
            </div>
            <button type="button" className="btn link small" onClick={leaveGame}>
              Lämna
            </button>
          </header>

          {error && <p className="error">{error}</p>}

          {room.status === 'lobby' && (
            <section className="card">
              <h2>Lobby</h2>
              {room.youAreHost ? (
                <>
                  <p className="lead">Dela koden eller QR så deltagarna kan ansluta.</p>
                  <div className="join-block">
                    <button type="button" className="code-big" onClick={copyCode}>
                      {room.code}
                    </button>
                    <p className="muted">{copied ? 'Kopierad!' : 'Tryck för att kopiera'}</p>
                    <JoinQr url={joinLink} alt={`QR för kod ${room.code}`} />
                  </div>
                  <ul className="player-list">
                    <li className="host">
                      {room.hostName} <em>testledare</em>
                    </li>
                    {room.players
                      .filter((p) => p.id !== room.hostId)
                      .map((p) => (
                        <li key={p.id} className={p.connected ? '' : 'away'}>
                          {p.name}
                          {!p.connected && ' (borta)'}
                        </li>
                      ))}
                  </ul>
                  <p className="muted">
                    {room.participantCount}/{room.minParticipants} deltagare
                  </p>
                  <RoundSelector
                    maxRounds={room.maxRounds}
                    disabled={busy}
                    onChange={() => {
                      /* room updates via socket */
                    }}
                  />
                  <div className="stack">
                    <button
                      type="button"
                      className="btn primary"
                      disabled={busy || room.participantCount < room.minParticipants}
                      onClick={() => act(startGame)}
                    >
                      Starta första testet
                    </button>
                    <a href={tvUrl(room.code)} className="btn secondary tv-link-btn" target="_blank" rel="noopener noreferrer">
                      Öppna TV-läge ↗
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <p className="lead">Väntar på att {room.hostName} startar…</p>
                  {room.maxRounds === 0 ? (
                    <p className="muted">Antal test: tills vi tröttnar</p>
                  ) : (
                    <p className="muted">{room.maxRounds} test planerade</p>
                  )}
                  <ul className="player-list">
                    {room.players.map((p) => (
                      <li key={p.id} className={p.id === room.hostId ? 'host' : ''}>
                        {p.name}
                        {p.id === room.hostId && ' · testledare'}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          {room.status === 'challenge' && room.challenge && (
            <section className="card challenge-card">
              <p className="eyebrow">{room.challenge.type}</p>
              <h2>{room.challenge.title}</h2>
              <p className="challenge-text">{room.challenge.description}</p>
              {countdown != null && countdown > 0 && (
                <div className="timer">{formatTime(countdown)}</div>
              )}
              {countdown === 0 && room.challenge.timeLimitSeconds != null && (
                <p className="muted">Tiden är ute — testledaren bedömer snart.</p>
              )}

              {room.youAreHost ? (
                <div className="host-actions">
                  <p className="muted">
                    {room.submittedCount}/{room.participantCount} har markerat klart
                  </p>
                  <button type="button" className="btn primary" disabled={busy} onClick={() => act(endChallenge)}>
                    Stopp — bedöm nu
                  </button>
                </div>
              ) : room.youSubmitted ? (
                <p className="ok-msg">Inlämnat! Väntar på testledaren…</p>
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
                        Lämna in teckning
                      </button>
                    </>
                  )}
                  {room.challenge.submissionMode === 'text' && (
                    <>
                      <textarea
                        value={textDraft}
                        onChange={(e) => setTextDraft(e.target.value)}
                        placeholder="Skriv ditt svar…"
                        rows={4}
                      />
                      <button
                        type="button"
                        className="btn primary"
                        disabled={busy || !textDraft.trim()}
                        onClick={() => act(() => submitResponse(textDraft))}
                      >
                        Lämna in svar
                      </button>
                    </>
                  )}
                  {room.challenge.submissionMode === 'physical' && (
                    <>
                      <p className="muted">Gör uppgiften i verkligheten. Tryck när du är redo.</p>
                      <button
                        type="button"
                        className="btn primary"
                        disabled={busy}
                        onClick={() => act(() => submitResponse('ready'))}
                      >
                        Jag är klar!
                      </button>
                    </>
                  )}
                </div>
              )}
            </section>
          )}

          {room.status === 'judging' && room.youAreHost && (
            <section className="card">
              <h2>Bedöm deltagarna</h2>
              <p className="muted">Ge 1–5 poäng per person. Alla måste poängsättas.</p>
              <div className="judge-grid">
                {room.players
                  .filter((p) => p.id !== room.hostId)
                  .map((p) => {
                    const sub = room.submissions.find((s) => s.playerId === p.id)
                    const given = hostScores[p.id]
                    return (
                      <article key={p.id} className={`judge-card${given != null ? ' scored' : ''}`}>
                        <div className="judge-card-head">
                          <h3>{p.name}</h3>
                          {given != null && <span className="score-given">Du gav: {given} poäng</span>}
                        </div>
                        {sub?.payload.startsWith('data:image') ? (
                          <img src={sub.payload} alt={`Teckning av ${p.name}`} className="submission-img" />
                        ) : sub?.payload === 'ready' ? (
                          <p className="muted">Fysiskt test — bedöm utifrån vad du såg.</p>
                        ) : sub ? (
                          <p className="submission-text">{sub.payload}</p>
                        ) : (
                          <p className="muted">Ingen inlämning</p>
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
              <h2>Bedömning pågår</h2>
              <p className="muted">{room.hostName} ger poäng…</p>
            </section>
          )}

          {room.status === 'scores' && (
            <section className="card">
              <h2>Poäng efter runda {room.roundIndex}</h2>
              {room.roundScores && (
                <ul className="round-scores">
                  {room.roundScores.map((r) => (
                    <li key={r.playerId}>
                      {r.name}: <strong>{r.points}</strong> poäng
                    </li>
                  ))}
                </ul>
              )}
              <h3>Totalt</h3>
              <Scoreboard room={room} />
              {room.youAreHost && (
                <div className="stack">
                  {room.maxRounds > 0 && room.roundIndex >= room.maxRounds ? null : (
                    <button type="button" className="btn primary" disabled={busy} onClick={() => act(nextRound)}>
                      Nästa test
                    </button>
                  )}
                  <button type="button" className="btn ghost" disabled={busy} onClick={() => act(endGame)}>
                    Avsluta spelet
                  </button>
                </div>
              )}
            </section>
          )}

          {room.status === 'finished' && (
            <section className="card">
              <h2>Spelet är slut!</h2>
              <Scoreboard room={room} />
              {room.youAreHost ? (
                <button type="button" className="btn primary" disabled={busy} onClick={() => act(backToLobby)}>
                  Tillbaka till lobby
                </button>
              ) : (
                <p className="muted">Tack för att du deltog!</p>
              )}
            </section>
          )}
        </main>
      )}
      </div>
    </div>
    </ErrorBoundary>
  )
}
