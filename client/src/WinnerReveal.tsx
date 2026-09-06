import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { Ui } from './i18n'
import type { PublicRoom } from './types'

type Phase = 'before' | 'distribute' | 'winner'

type Entry = {
  playerId: string
  name: string
  before: number
  delta: number
  after: number
}

function buildEntries(room: PublicRoom): Entry[] {
  const roundMap = new Map(room.roundScores?.map((r) => [r.playerId, r.points]) ?? [])
  return room.scores.map((s) => {
    const delta = roundMap.get(s.playerId) ?? 0
    return {
      playerId: s.playerId,
      name: s.name,
      before: s.score - delta,
      delta,
      after: s.score,
    }
  })
}

export function WinnerReveal({ room, ui, tv = false }: { room: PublicRoom; ui: Ui; tv?: boolean }) {
  const entries = useMemo(() => buildEntries(room), [room.scores, room.roundScores])
  const [phase, setPhase] = useState<Phase>('before')
  const [shownScores, setShownScores] = useState<Record<string, number>>({})

  const sortedBefore = useMemo(
    () => [...entries].sort((a, b) => b.before - a.before || a.name.localeCompare(b.name, 'sv')),
    [entries],
  )
  const sortedAfter = useMemo(
    () => [...entries].sort((a, b) => b.after - a.after || a.name.localeCompare(b.name, 'sv')),
    [entries],
  )

  const order = phase === 'before' ? sortedBefore : sortedAfter
  const winnerId = sortedAfter[0]?.playerId ?? null

  useEffect(() => {
    const initial = Object.fromEntries(entries.map((e) => [e.playerId, e.before]))
    setShownScores(initial)
    setPhase('before')

    const distributeTimer = window.setTimeout(() => {
      setPhase('distribute')
      setShownScores(Object.fromEntries(entries.map((e) => [e.playerId, e.after])))
    }, 2600)

    const winnerTimer = window.setTimeout(() => setPhase('winner'), 4200)

    return () => {
      window.clearTimeout(distributeTimer)
      window.clearTimeout(winnerTimer)
    }
  }, [room.code, room.roundIndex, entries])

  const kicker =
    phase === 'before'
      ? ui.winnerBefore
      : phase === 'distribute'
        ? ui.winnerDistribute
        : ui.winner

  return (
    <div className={`winner-reveal${tv ? ' tv' : ''} phase-${phase}`}>
      <p className="winner-reveal-kicker">{kicker}</p>
      <ol className="winner-reveal-track" aria-label={ui.finalStandings}>
        {order.map((entry, rank) => {
          const isWinner = phase === 'winner' && entry.playerId === winnerId
          return (
            <li
              key={entry.playerId}
              className={`winner-card${isWinner ? ' winner' : ''}`}
              style={{ '--rank': rank } as CSSProperties}
            >
              <span className="winner-card-rank">{rank + 1}</span>
              <span className="winner-card-name">{entry.name}</span>
              <span className="winner-card-score">{shownScores[entry.playerId] ?? entry.before} p</span>
              {phase !== 'before' && entry.delta > 0 && (
                <span className="winner-card-delta">+{entry.delta}</span>
              )}
              {isWinner && <span className="winner-crown" aria-hidden="true">👑</span>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
