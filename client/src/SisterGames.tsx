import type { Ui } from './i18n'

const PARTY_PATHS_URL = 'https://partypaths.com'
const FACTOPIA_URL = 'https://factopia.net'
const SABOTEXT_URL = 'https://sabotext.com'
const SCOURGEBORN_URL = 'https://scourgeborn.com'

function SisterGameLink({
  name,
  href,
  pitch,
  cta,
  compact,
}: {
  name: string
  href: string
  pitch: string
  cta: string
  compact?: boolean
}) {
  return (
    <a
      className={`sister-game${compact ? ' compact' : ''}`}
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      <strong>{name}</strong>
      <span>{pitch}</span>
      <em>{cta}</em>
    </a>
  )
}

export function SisterGames({ ui, compact }: { ui: Ui; compact?: boolean }) {
  return (
    <div className={`sister-games${compact ? ' compact' : ''}`}>
      <SisterGameLink
        name="Party Paths"
        href={PARTY_PATHS_URL}
        pitch={ui.partypathsPitch}
        cta={ui.partypathsCta}
        compact={compact}
      />
      <SisterGameLink
        name="Factopia"
        href={FACTOPIA_URL}
        pitch={ui.factopiaPitch}
        cta={ui.factopiaCta}
        compact={compact}
      />
      <SisterGameLink
        name="Sabotext"
        href={SABOTEXT_URL}
        pitch={ui.sabotextPitch}
        cta={ui.sabotextCta}
        compact={compact}
      />
      <SisterGameLink
        name="Scourgeborn"
        href={SCOURGEBORN_URL}
        pitch={ui.scourgebornPitch}
        cta={ui.scourgebornCta}
        compact={compact}
      />
    </div>
  )
}
