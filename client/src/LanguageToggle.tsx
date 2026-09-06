import type { Lang } from './i18n'

export function LanguageToggle({
  lang,
  onChange,
  label,
}: {
  lang: Lang
  onChange: (lang: Lang) => void
  label: string
}) {
  return (
    <div className="lang-toggle" aria-label={label}>
      <button
        type="button"
        className={lang === 'sv' ? 'active' : ''}
        aria-pressed={lang === 'sv'}
        onClick={() => onChange('sv')}
      >
        SV
      </button>
      <button
        type="button"
        className={lang === 'en' ? 'active' : ''}
        aria-pressed={lang === 'en'}
        onClick={() => onChange('en')}
      >
        EN
      </button>
    </div>
  )
}
