import { useEffect } from 'react'
import type { Lang } from './i18n'

const DEFAULT_TITLE = 'Your Task Is'
const DEFAULT_DESC_SV =
  'Your Task Is — hemma-Bäst-i-Test. Testledaren läser upp, du utför, domaren ger poäng.'
const DEFAULT_DESC_EN =
  'Your Task Is — living-room challenges. Host reads tasks, you perform, score 1–5.'

function setMeta(name: string, content: string, prop = false) {
  const attr = prop ? 'property' : 'name'
  let el = document.querySelector(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function usePageMeta(lang: Lang, joinCode?: string | null) {
  useEffect(() => {
    const origin = window.location.origin
    const desc = lang === 'en' ? DEFAULT_DESC_EN : DEFAULT_DESC_SV

    if (joinCode && joinCode.length === 4) {
      const code = joinCode.toUpperCase()
      const title =
        lang === 'en'
          ? `Join Your Task Is — ${code}`
          : `Gå med i Your Task Is — ${code}`
      const joinDesc =
        lang === 'en'
          ? `You're invited to a living-room game. Join with code ${code}.`
          : `Du är inbjuden till ett hemma-Bäst-i-Test. Anslut med koden ${code}.`
      document.title = title
      setMeta('description', joinDesc)
      setMeta('og:title', title, true)
      setMeta('og:description', joinDesc, true)
      setMeta('og:url', `${origin}/?join=${code}`, true)
    } else {
      document.title = DEFAULT_TITLE
      setMeta('description', desc)
      setMeta('og:title', DEFAULT_TITLE, true)
      setMeta('og:description', desc, true)
      setMeta('og:url', origin, true)
    }

    setMeta('og:type', 'website', true)
    setMeta('og:site_name', 'Your Task Is', true)
    setMeta('og:image', `${origin}/og.svg`, true)
  }, [lang, joinCode])
}
