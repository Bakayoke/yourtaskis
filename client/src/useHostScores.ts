import { useEffect, useState } from 'react'
import type { PublicRoom } from './types'

/** Tracks host-assigned scores during judging (server only exposes roundScores after all scored). */
export function useHostScores(room: PublicRoom | null) {
  const [scores, setScores] = useState<Record<string, number>>({})

  useEffect(() => {
    if (room?.status !== 'judging') setScores({})
  }, [room?.status, room?.roundIndex])

  function recordScore(playerId: string, points: number) {
    setScores((prev) => ({ ...prev, [playerId]: points }))
  }

  return { scores, recordScore }
}
