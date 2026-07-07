import 'server-only'
import { loadEnv } from '@sa/config'
import { getAuthClient } from './google-auth'

/**
 * GA4 Data API — thin server-side reads for the dashboard.
 * Mirrors the client shape in apps/api but adds the daily-timeseries
 * fetch we need for the traffic chart on the console.
 *
 * All returns are safe-empty on transient failure so a 403 during
 * GA4-permission propagation doesn't take down the whole page — the
 * cards simply render as "—" or empty tables.
 */

const REQUEST_TIMEOUT_MS = 20_000

const url = (propertyId: string) =>
  `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`

type Ga4Row = {
  dimensionValues?: Array<{ value?: string }>
  metricValues?: Array<{ value?: string }>
}
type Ga4Response = { rows?: Ga4Row[] }

async function post<T>(body: unknown): Promise<T | null> {
  const env = loadEnv()
  const pid = env.GA4_PROPERTY_ID
  if (!pid) return null
  const auth = await getAuthClient()
  if (!auth) return null
  let token: string | null | undefined
  try {
    const t = await auth.getAccessToken()
    token = t.token
  } catch {
    return null
  }
  if (!token) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url(pid), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console[res.status === 403 ? 'warn' : 'error']('[ga4] HTTP', res.status, txt.slice(0, 200))
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.error('[ga4] fetch failed', { err: (err as Error).message })
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ── Overview totals ──────────────────────────────────────────

export type Ga4Totals = {
  users: number
  sessions: number
  pageViews: number
  engagementRate: number
}

export async function ga4Totals(windowDays: number): Promise<Ga4Totals> {
  const data = await post<Ga4Response>({
    dateRanges: [{ startDate: `${windowDays}daysAgo`, endDate: 'today' }],
    metrics: [
      { name: 'totalUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'engagementRate' },
    ],
  })
  const r = data?.rows?.[0]?.metricValues ?? []
  return {
    users: Number(r[0]?.value ?? 0),
    sessions: Number(r[1]?.value ?? 0),
    pageViews: Number(r[2]?.value ?? 0),
    engagementRate: Number(r[3]?.value ?? 0),
  }
}

// ── Daily users timeseries (for the chart) ───────────────────

export type Ga4DailyPoint = { date: string; users: number; sessions: number }

export async function ga4DailyUsers(windowDays: number): Promise<Ga4DailyPoint[]> {
  const data = await post<Ga4Response>({
    dateRanges: [{ startDate: `${windowDays}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
    limit: '400',
  })
  const rows = data?.rows ?? []
  return rows
    .map((r) => ({
      // GA emits YYYYMMDD without dashes; reformat for consistency.
      date: formatDate(r.dimensionValues?.[0]?.value ?? ''),
      users: Number(r.metricValues?.[0]?.value ?? 0),
      sessions: Number(r.metricValues?.[1]?.value ?? 0),
    }))
    .filter((p) => p.date)
}

function formatDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return ''
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

// ── Top pages ────────────────────────────────────────────────

export type Ga4PageRow = {
  pagePath: string
  sessions: number
  users: number
  engagementRate: number
}

export async function ga4TopPages(windowDays: number, limit: number): Promise<Ga4PageRow[]> {
  const data = await post<Ga4Response>({
    dateRanges: [{ startDate: `${windowDays}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagementRate' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: String(limit),
    keepEmptyRows: false,
  })
  return (data?.rows ?? [])
    .map((r) => ({
      pagePath: r.dimensionValues?.[0]?.value ?? '',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      users: Number(r.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(r.metricValues?.[2]?.value ?? 0),
    }))
    .filter((r) => r.pagePath)
}
