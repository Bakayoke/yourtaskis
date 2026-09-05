import { useCallback, useEffect, useState } from 'react'

export function useFullscreen() {
  const [active, setActive] = useState(() => !!document.fullscreenElement)

  useEffect(() => {
    const onChange = () => setActive(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const enter = useCallback(async () => {
    if (document.fullscreenElement) return true
    try {
      await document.documentElement.requestFullscreen()
      return true
    } catch {
      return false
    }
  }, [])

  const exit = useCallback(async () => {
    if (!document.fullscreenElement) return true
    try {
      await document.exitFullscreen()
      return true
    } catch {
      return false
    }
  }, [])

  const toggle = useCallback(async () => {
    if (document.fullscreenElement) return exit()
    return enter()
  }, [enter, exit])

  return { active, enter, exit, toggle }
}
