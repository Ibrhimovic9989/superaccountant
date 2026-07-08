import 'server-only'
import { loadEnv } from '@sa/config'
import { getAuthClient } from './google-auth'

/**
 * GA4 Data API — thin server-side reads for the dashboard.
 * Shapes the report you'd get from Reports → "Pages and screens" in the
 * GA4 UI: (pageTitle, pagePath) rows with views + active users + views
 * per active user + engagement time per active user + event count.
 *
 * Two extra fetchers back the multi-series traffic chart:
 *   - ga4DailyTotals: overall daily users + sessions (thin overview line)
 *   - ga4DailyViewsByTitle: per-day views for the top N page titles so
 *     the chart can show one coloured series per page (matches the GA4
 *     UI's "Views by page title over time" chart).
 *
 * All returns fail safe-empty on transient error so the console renders
 * "—" or blank tables instead of crashing when GA4 hiccups.
 */

const REQUEST_TIMEOUT_MS = 20_000

const url = (propertyId: string) =>
  `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`

type Ga4Row = {
  dimensionValues?: Array<{ value?: string }>
  metricValues?: Array<{ value?: string }>
}
type Ga4Response = { rows?: Ga4Row[]; totals?: Ga4Row[] }

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

// ── Daily total users timeseries ─────────────────────────────

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

// ── Pages and screens (matches the GA4 UI report) ────────────

export type Ga4PageRow = {
  /** Human-readable browser tab / document title. */
  pageTitle: string
  /** URL path, kept alongside so we can link and disambiguate duplicates. */
  pagePath: string
  views: number
  activeUsers: number
  /**
   * `screenPageViewsPerUser` — GA4's built-in metric matching the
   * "Views per active user" column in the GA UI.
   */
  viewsPerActiveUser: number
  /** userEngagementDuration / activeUsers — seconds per user. */
  avgEngagementTimeSec: number
  eventCount: number
}

/**
 * Top pages by views, with the same five columns the GA4 UI's
 * "Pages and screens" report shows. Rolled up per pageTitle so the
 * same title appearing at multiple paths (rare, but happens on the
 * homepage during redirects) collapses into a single row.
 */
export async function ga4TopPages(windowDays: number, limit: number): Promise<Ga4PageRow[]> {
  const data = await post<Ga4Response>({
    dateRanges: [{ startDate: `${windowDays}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'activeUsers' },
      { name: 'screenPageViewsPerUser' },
      { name: 'userEngagementDuration' },
      { name: 'eventCount' },
    ],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: String(limit * 2), // pull extra so post-roll-up we still have `limit` rows
    keepEmptyRows: false,
  })
  const raw = (data?.rows ?? []).map((r) => ({
    pageTitle: (r.dimensionValues?.[0]?.value ?? '').trim() || '(untitled)',
    pagePath: r.dimensionValues?.[1]?.value ?? '',
    views: Number(r.metricValues?.[0]?.value ?? 0),
    activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
    viewsPerActiveUser: Number(r.metricValues?.[2]?.value ?? 0),
    engagementDurationSec: Number(r.metricValues?.[3]?.value ?? 0),
    eventCount: Number(r.metricValues?.[4]?.value ?? 0),
  }))

  // Roll up duplicate titles (same page, multiple paths). Keep the
  // path with the most views as the representative path.
  const byTitle = new Map<
    string,
    Ga4PageRow & { engagementDurationSec: number; topPath: string; topPathViews: number }
  >()
  for (const r of raw) {
    const existing = byTitle.get(r.pageTitle)
    if (!existing) {
      byTitle.set(r.pageTitle, {
        pageTitle: r.pageTitle,
        pagePath: r.pagePath,
        views: r.views,
        activeUsers: r.activeUsers,
        viewsPerActiveUser: r.viewsPerActiveUser,
        avgEngagementTimeSec: r.activeUsers > 0 ? r.engagementDurationSec / r.activeUsers : 0,
        eventCount: r.eventCount,
        engagementDurationSec: r.engagementDurationSec,
        topPath: r.pagePath,
        topPathViews: r.views,
      })
      continue
    }
    existing.views += r.views
    existing.activeUsers += r.activeUsers
    existing.engagementDurationSec += r.engagementDurationSec
    existing.eventCount += r.eventCount
    if (r.views > existing.topPathViews) {
      existing.topPath = r.pagePath
      existing.topPathViews = r.views
    }
  }

  const rows: Ga4PageRow[] = []
  for (const v of byTitle.values()) {
    rows.push({
      pageTitle: v.pageTitle,
      pagePath: v.topPath,
      views: v.views,
      activeUsers: v.activeUsers,
      // Recompute the "per user" metric after roll-up — the raw GA4
      // value isn't additive across the split rows.
      viewsPerActiveUser: v.activeUsers > 0 ? v.views / v.activeUsers : 0,
      avgEngagementTimeSec: v.activeUsers > 0 ? v.engagementDurationSec / v.activeUsers : 0,
      eventCount: v.eventCount,
    })
  }
  rows.sort((a, b) => b.views - a.views)
  return rows.slice(0, limit)
}

// ── Per-hostname performance (for the blog drilldown) ──────

export type Ga4HostPageRow = {
  hostname: string
  pagePath: string
  views: number
  activeUsers: number
  eventCount: number
}

/**
 * Pulls (hostname, pagePath) with views/users/events for the whole
 * window — used to join GA4 traffic onto BlogPost rows on the console.
 * Kept separate from ga4TopPages so the "Pages and screens" report can
 * stay title-grouped while the blog drilldown joins on URL exactly.
 */
export async function ga4PagesByHost(
  windowDays: number,
  hostname: string,
): Promise<Ga4HostPageRow[]> {
  const data = await post<Ga4Response>({
    dateRanges: [{ startDate: `${windowDays}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'hostName' }, { name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'activeUsers' },
      { name: 'eventCount' },
    ],
    dimensionFilter: {
      filter: {
        fieldName: 'hostName',
        stringFilter: { matchType: 'EXACT', value: hostname },
      },
    },
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: '500',
    keepEmptyRows: false,
  })
  return (data?.rows ?? [])
    .map((r) => ({
      hostname: r.dimensionValues?.[0]?.value ?? '',
      pagePath: r.dimensionValues?.[1]?.value ?? '',
      views: Number(r.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
      eventCount: Number(r.metricValues?.[2]?.value ?? 0),
    }))
    .filter((r) => r.pagePath)
}

// ── Per-page daily views (for the multi-series chart) ────────

export type Ga4DailyByTitle = {
  /** ISO YYYY-MM-DD (sorted ascending). */
  dates: string[]
  /**
   * Ordered by descending total views. Each series has a name + a same-
   * length values array aligned to `dates`.
   */
  series: Array<{ pageTitle: string; values: number[]; total: number }>
}

/**
 * Views per (date, pageTitle) for the top N titles in the window,
 * suitable for a multi-line/area chart. Uses a targeted `inListFilter`
 * so we only pay to fetch data for the titles we're going to plot.
 */
export async function ga4DailyViewsByTitle(
  windowDays: number,
  topN: number,
): Promise<Ga4DailyByTitle> {
  // 1. Pick the winners.
  const top = await ga4TopPages(windowDays, topN)
  if (top.length === 0) return { dates: [], series: [] }
  const titles = top.map((r) => r.pageTitle)

  // 2. Pull per-day views for just those titles.
  const data = await post<Ga4Response>({
    dateRanges: [{ startDate: `${windowDays}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'date' }, { name: 'pageTitle' }],
    metrics: [{ name: 'screenPageViews' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
    dimensionFilter: {
      filter: {
        fieldName: 'pageTitle',
        inListFilter: { values: titles, caseSensitive: false },
      },
    },
    limit: '10000',
    keepEmptyRows: true,
  })

  // Build the (title, date) grid.
  const dateSet = new Set<string>()
  const titleToBucket = new Map<string, Map<string, number>>()
  for (const r of data?.rows ?? []) {
    const date = formatDate(r.dimensionValues?.[0]?.value ?? '')
    const title = (r.dimensionValues?.[1]?.value ?? '').trim() || '(untitled)'
    const views = Number(r.metricValues?.[0]?.value ?? 0)
    if (!date) continue
    dateSet.add(date)
    const bucket = titleToBucket.get(title) ?? new Map<string, number>()
    bucket.set(date, (bucket.get(date) ?? 0) + views)
    titleToBucket.set(title, bucket)
  }
  const dates = [...dateSet].sort()

  const series = titles
    .map((title) => {
      const bucket = titleToBucket.get(title) ?? new Map<string, number>()
      const values = dates.map((d) => bucket.get(d) ?? 0)
      return { pageTitle: title, values, total: values.reduce((a, b) => a + b, 0) }
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total)

  return { dates, series }
}
