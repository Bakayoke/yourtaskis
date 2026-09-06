const PARTY_PATHS_URL = 'https://partypaths.com'
const FACTOPIA_URL = 'https://factopia.net'
const SABOTEXT_URL = 'https://sabotext.com'
const SCOURGEBORN_URL = 'https://scourgeborn.com'

const GAMES = [
  {
    name: 'Party Paths',
    href: PARTY_PATHS_URL,
    pitch: 'Hellre brädspel på soffan? Samla laget på Party Paths.',
    cta: 'Öppna partypaths.com →',
  },
  {
    name: 'Factopia',
    href: FACTOPIA_URL,
    pitch: 'Hellre party-quiz? Utmana kompisarna på Factopia.',
    cta: 'Öppna factopia.net →',
  },
  {
    name: 'Sabotext',
    href: SABOTEXT_URL,
    pitch: 'Hellre SMS-kaos? Sabotera varandras texter på Sabotext.',
    cta: 'Öppna sabotext.com →',
  },
  {
    name: 'Scourgeborn',
    href: SCOURGEBORN_URL,
    pitch: 'Hellre skapa ett virus som utplånar jorden? Kör Scourgeborn.',
    cta: 'Öppna scourgeborn.com →',
  },
] as const

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

export function SisterGames({ compact }: { compact?: boolean }) {
  return (
    <div className={`sister-games${compact ? ' compact' : ''}`}>
      {GAMES.map((game) => (
        <SisterGameLink key={game.name} {...game} compact={compact} />
      ))}
    </div>
  )
}
