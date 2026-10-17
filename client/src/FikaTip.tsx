import { useState } from 'react'
import type { Ui } from './i18n'

/** Swish MSISDN without + (073-045 79 30) */
export const SWISH_MSISDN = '46730457930'

export function swishPaymentHref(message: string) {
  const params = new URLSearchParams({ sw: SWISH_MSISDN })
  const trimmed = message.trim()
  if (trimmed) params.set('msg', trimmed)
  return `https://app.swish.nu/1/p/sw/?${params.toString()}`
}

export function FikaTip({ ui }: { ui: Ui }) {
  const [copied, setCopied] = useState(false)
  const href = swishPaymentHref(ui.fikaMessage)

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
      <a href={href} className="fika-tip-link">
        {ui.fikaCta}
      </a>
      <span className="fika-tip-sep"> · </span>
      <button type="button" className="btn link small fika-tip-copy" onClick={() => void copyNumber()}>
        {copied ? ui.fikaCopied : ui.fikaCopy}
      </button>
    </p>
  )
}
