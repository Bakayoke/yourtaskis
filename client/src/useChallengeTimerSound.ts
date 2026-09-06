import { useEffect, useRef } from 'react'
import { playTimeUp } from './gameSounds'

export function useChallengeTimerSound(
  countdown: number | null,
  hasTimeLimit: boolean,
  roundKey: string | number,
) {
  const prev = useRef<number | null>(null)

  useEffect(() => {
    prev.current = null
  }, [roundKey])

  useEffect(() => {
    if (countdown == null || !hasTimeLimit) return
    if (prev.current != null && prev.current > 0 && countdown === 0) {
      playTimeUp()
    }
    prev.current = countdown
  }, [countdown, hasTimeLimit, roundKey])
}
