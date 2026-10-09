import { timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getRedisClient } from './persist.js'

const REDIS_HASH = 'yourtaskis:stats:games_started_by_day'
const REDIS_TOTAL = 'yourtaskis:stats:games_started_total'
const STATS_FILENAME = 'yourtaskis-game-stats.json'

export type GameStartStats = {
  byDay: Record<string, number>
  total: number
  timezone: string
  storage: 'redis' | 'file' | 'memory'
}

type StatsFile = {
  byDay: Record<string, number>
  total: number
}

let memory: StatsFile = { byDay: {}, total: 0 }
let statsFileDir: string | null = null

export function configureGameStatsFileDir(dir: string | null) {
  statsFileDir = dir?.trim() || null
}

export async function loadGameStatsFromFile(): Promise<void> {
  if (!statsFileDir) return
  const file = path.join(statsFileDir, STATS_FILENAME)
  try {
    const raw = await readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as StatsFile
    if (parsed && typeof parsed.byDay === 'object') {
      memory = {
        byDay: { ...parsed.byDay },
        total: typeof parsed.total === 'number' ? parsed.total : 0,
      }
    }
  } catch {
    /* fresh file */
  }
}

async function saveStatsFile(data: StatsFile): Promise<void> {
  if (!statsFileDir) return
  const file = path.join(statsFileDir, STATS_FILENAME)
  await mkdir(statsFileDir, { recursive: true })
  await writeFile(file, JSON.stringify(data, null, 0), 'utf8')
}

export function stockholmDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export async function recordGameStarted(): Promise<void> {
  const day = stockholmDayKey()
  const redis = getRedisClient()
  if (redis) {
    await redis.hIncrBy(REDIS_HASH, day, 1)
    await redis.incr(REDIS_TOTAL)
    return
  }

  memory.byDay[day] = (memory.byDay[day] ?? 0) + 1
  memory.total += 1
  await saveStatsFile(memory)
}

function normalizeByDay(raw: Record<string, string | number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [day, n] of Object.entries(raw)) {
    const v = typeof n === 'number' ? n : Number.parseInt(String(n), 10)
    if (Number.isFinite(v) && v > 0) out[day] = v
  }
  return out
}

export async function getGameStartStats(): Promise<GameStartStats> {
  const redis = getRedisClient()
  if (redis) {
    const [byDayRaw, totalRaw] = await Promise.all([
      redis.hGetAll(REDIS_HASH),
      redis.get(REDIS_TOTAL),
    ])
    const byDay = normalizeByDay((byDayRaw ?? {}) as Record<string, string>)
    let total = Number.parseInt(String(totalRaw ?? ''), 10)
    if (!Number.isFinite(total)) {
      total = Object.values(byDay).reduce((a, b) => a + b, 0)
    }
    return { byDay, total, timezone: 'Europe/Stockholm', storage: 'redis' }
  }

  if (statsFileDir) {
    await loadGameStatsFromFile()
    return {
      byDay: { ...memory.byDay },
      total: memory.total,
      timezone: 'Europe/Stockholm',
      storage: 'file',
    }
  }

  return {
    byDay: { ...memory.byDay },
    total: memory.total,
    timezone: 'Europe/Stockholm',
    storage: 'memory',
  }
}

export function adminStatsTokenConfigured(): boolean {
  return Boolean(process.env.ADMIN_STATS_TOKEN?.trim())
}

export function verifyAdminStatsToken(provided: string): boolean {
  const expected = process.env.ADMIN_STATS_TOKEN?.trim()
  if (!expected || !provided) return false
  try {
    const a = Buffer.from(provided)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

function dayKeyDaysAgo(daysBack: number): string {
  const t = Date.now() - daysBack * 86_400_000
  return stockholmDayKey(new Date(t))
}

function sumLastDays(byDay: Record<string, number>, count: number): number {
  if (count <= 0) return 0
  const from = dayKeyDaysAgo(count - 1)
  return Object.entries(byDay)
    .filter(([day]) => day >= from)
    .reduce((acc, [, n]) => acc + n, 0)
}

export function renderGameStatsHtml(stats: GameStartStats, liveRooms: number): string {
  const today = stockholmDayKey()
  const rows = Object.entries(stats.byDay).sort(([a], [b]) => b.localeCompare(a))
  const last7 = sumLastDays(stats.byDay, 7)
  const last30 = sumLastDays(stats.byDay, 30)
  const todayCount = stats.byDay[today] ?? 0

  const tableRows =
    rows.length === 0
      ? '<tr><td colspan="2" class="muted">Inga spelstart registrerade ännu.</td></tr>'
      : rows
          .map(
            ([day, count]) =>
              `<tr${day === today ? ' class="today"' : ''}><td>${day}</td><td>${count}</td></tr>`,
          )
          .join('\n')

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Your Task Is — admin stats</title>
  <style>
    :root { color-scheme: dark; --bg: #120c18; --ink: #f5eef8; --muted: #a89bb0; --brand: #f4c430; --line: rgba(255,255,255,0.12); }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--ink); margin: 0; padding: 1.5rem; line-height: 1.5; }
    h1 { font-size: 1.35rem; margin: 0 0 0.25rem; }
    .meta { color: var(--muted); font-size: 0.9rem; margin-bottom: 1.25rem; }
    .cards { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.5rem; }
    .card { background: rgba(255,255,255,0.06); border: 1px solid var(--line); border-radius: 10px; padding: 0.85rem 1rem; min-width: 8rem; }
    .card strong { display: block; font-size: 1.75rem; color: var(--brand); }
    .card span { font-size: 0.85rem; color: var(--muted); }
    table { width: 100%; max-width: 28rem; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.5rem 0.65rem; border-bottom: 1px solid var(--line); }
    th { color: var(--muted); font-weight: 600; font-size: 0.85rem; }
    tr.today td { font-weight: 700; color: var(--brand); }
    .muted { color: var(--muted); }
  </style>
</head>
<body>
  <h1>Your Task Is — startade spel</h1>
  <p class="meta">Dagar i ${stats.timezone} · lagring: ${stats.storage} · aktiva rum nu: ${liveRooms}</p>
  <div class="cards">
    <div class="card"><strong>${todayCount}</strong><span>Idag</span></div>
    <div class="card"><strong>${last7}</strong><span>Senaste 7 dagar</span></div>
    <div class="card"><strong>${last30}</strong><span>Senaste 30 dagar</span></div>
    <div class="card"><strong>${stats.total}</strong><span>Totalt (alla dagar)</span></div>
  </div>
  <table>
    <thead><tr><th>Datum</th><th>Startade spel</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`
}
