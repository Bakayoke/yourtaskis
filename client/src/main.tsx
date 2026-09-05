import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element #root not found')
}

try {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (error) {
  rootEl.innerHTML = `
    <main style="margin:2rem;font-family:system-ui,sans-serif;color:#faf6f0">
      <h1 style="margin:0 0 1rem">Kunde inte starta appen</h1>
      <p style="color:#ffb4bc">${error instanceof Error ? error.message : 'Okänt fel'}</p>
      <button type="button" onclick="localStorage.clear();location.reload()" style="margin-top:1rem;padding:0.75rem 1rem;border-radius:999px;border:none;background:#f4c430;color:#1a1020;font-weight:700;cursor:pointer">
        Rensa och försök igen
      </button>
    </main>
  `
}
