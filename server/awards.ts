import type { Player, Room, SessionAward } from './types.js'

function nameOf(room: Room, playerId: string) {
  return room.players.find((p) => p.id === playerId)?.name ?? '?'
}

function participants(room: Room): Player[] {
  return room.players.filter((p) => p.id !== room.hostId)
}

export function computeSessionAwards(room: Room): SessionAward[] {
  const awards: SessionAward[] = []
  const seen = new Set<string>()

  function add(id: string, playerId: string) {
    if (seen.has(id)) return
    seen.add(id)
    awards.push({ id, playerId, playerName: nameOf(room, playerId) })
  }

  const fiveStars = participants(room)
    .map((p) => ({ id: p.id, n: room.fiveStarCounts[p.id] ?? 0 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
  if (fiveStars[0]) add('hostFavorite', fiveStars[0].id)

  let worstDraw: { id: string; pts: number } | null = null
  let bestRound: { id: string; pts: number } | null = null
  for (const round of room.roundHistory) {
    for (const [playerId, pts] of Object.entries(round.pointsByPlayer)) {
      if (pts <= 0) continue
      if (!bestRound || pts > bestRound.pts) bestRound = { id: playerId, pts }
      if (round.submissionMode === 'draw') {
        if (!worstDraw || pts < worstDraw.pts) worstDraw = { id: playerId, pts }
      }
    }
  }
  if (worstDraw) add('worstMasterpiece', worstDraw.id)
  if (bestRound) add('roundHero', bestRound.id)

  const reactionTotals = new Map<string, number>()
  for (const r of room.reactionLog) {
    reactionTotals.set(r.to, (reactionTotals.get(r.to) ?? 0) + 1)
  }
  const topReactions = [...reactionTotals.entries()].sort((a, b) => b[1] - a[1])
  if (topReactions[0]?.[1]) add('crowdFavorite', topReactions[0][0])

  const sorted = participants(room).sort((a, b) => b.score - a.score)
  if (sorted[1] && sorted[0]?.id !== sorted[1].id) add('almostChampion', sorted[1].id)

  return awards.slice(0, 4)
}
