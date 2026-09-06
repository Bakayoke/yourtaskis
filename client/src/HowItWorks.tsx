import type { Ui } from './i18n'

export function HowItWorks({ ui }: { ui: Ui }) {
  const steps = [ui.howStep1, ui.howStep2, ui.howStep3, ui.howStep4]
  return (
    <section className="how-it-works" aria-labelledby="how-it-works-title">
      <h2 id="how-it-works-title">{ui.howItWorksTitle}</h2>
      <ol>
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </section>
  )
}
