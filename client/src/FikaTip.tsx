import { useState, type MouseEvent } from 'react'
import type { Ui } from './i18n'

/** Swish MSISDN without + (073-045 79 30) */
export const SWISH_MSISDN = '46730457930'

function isMobileSwishDevice() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/** Official https universal-link form (Swish QR spec). */
export function swishPaymentHref(message: string) {
  const params = new URLSearchParams({
    sw: SWISH_MSISDN,
    cur: 'SEK',
    edit: 'amt,msg',
  })
  const trimmed = message.trim()
  if (trimmed) params.set('msg', trimmed)
  return `https://app.swish.nu/1/p/sw/?${params.toString()}`
}

/** Opens Swish with prefilled payee + message (community format; works on tap on mobile). */
export function swishDeepLink(message: string) {
  const payload = {
    version: 1,
    payee: { value: SWISH_MSISDN },
    message: { value: message.trim() || 'Fika' },
  }
  return `swish://payment?data=${encodeURIComponent(JSON.stringify(payload))}`
}

export function openSwishPayment(message: string) {
  const https = swishPaymentHref(message)
  if (!isMobileSwishDevice()) {
    window.open(https, '_blank', 'noopener,noreferrer')
    return
  }

  const deep = swishDeepLink(message)
  window.location.assign(deep)
  window.setTimeout(() => {
    if (!document.hidden) window.location.assign(https)
  }, 750)
}

export function FikaTip({ ui }: { ui: Ui }) {
  const [copied, setCopied] = useState(false)
  const href = swishPaymentHref(ui.fikaMessage)

  function onFikaClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    openSwishPayment(ui.fikaMessage)
  }

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText('0730457930')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <p className="fika-tip muted">
      <a href={href} className="fika-tip-link" onClick={onFikaClick}>
        {ui.fikaCta}
      </a>
      <span className="fika-tip-sep"> · </span>
      <button type="button" className="btn link small fika-tip-copy" onClick={() => void copyNumber()}>
        {copied ? ui.fikaCopied : ui.fikaCopy}
      </button>
    </p>
  )
}
