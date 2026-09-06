let audioCtx: AudioContext | null = null

function ctx() {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

function tone(freq: number, durationMs: number, type: OscillatorType = 'sine', gain = 0.08) {
  try {
    const ac = ctx()
    void ac.resume()
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.value = gain
    osc.connect(g)
    g.connect(ac.destination)
    const now = ac.currentTime
    g.gain.setValueAtTime(gain, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000)
    osc.start(now)
    osc.stop(now + durationMs / 1000)
  } catch {
    /* ignore — autoplay policies etc. */
  }
}

export function playTimeUp() {
  tone(880, 120, 'square', 0.05)
  window.setTimeout(() => tone(660, 180, 'square', 0.05), 130)
  vibrate([80, 40, 80])
}

export function playWinner() {
  tone(523, 140, 'triangle', 0.07)
  window.setTimeout(() => tone(659, 140, 'triangle', 0.07), 150)
  window.setTimeout(() => tone(784, 260, 'triangle', 0.08), 300)
  vibrate([60, 30, 60, 30, 120])
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* ignore */
  }
}
