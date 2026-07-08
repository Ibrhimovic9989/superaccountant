import 'server-only'
import { loadEnv } from '@sa/config'
import { getAuthClient } from './google-auth'

/**
 * Google Search Console — Search Analytics reads.
 * Two entry points:
 *  - gscTotals: aggregate impressions + clicks + avg position for the window
 *  - gscTopQueries: (query, page) rows sorted by impressions
 *
 * Same fail-open pattern as ga4.ts.
 */

const REQUEST_TIMEOUT_MS = 20_000

const url = (site: string) =>
  `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`

type GscResponse = {
  rows?: Array<{
    keys?: string[]
    clicks?: number
    impressions?: number
    ctr?: number
    position?: number
  }>
}

async function post<T>(body: unknown): Promise<T | null> {
  const env = loadEnv()
  const site = env.GSC_SITE_URL
  if (!site) return null
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
    const res = await fetch(url(site), {
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
      console[res.status === 403 ? 'warn' : 'error']('[gsc] HTTP', res.status, txt.slice(0, 200))
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.error('[gsc] fetch failed', { err: (err as Error).message })
    return null
  } finally {
    clearTimeout(timer)
  }
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

/**
 * GSC data lags 2–3 days. Anchor the end of every window at today - 3
 * so we get non-empty results — endDate = today would come back with
 * zero rows during the pending-processing window.
 */
const GSC_LAG_DAYS = 3

// ── Totals ──────────────────────────────────────────────────

export type GscTotals = {
  impressions: number
  clicks: number
  ctr: number
  position: number
}

export async function gscTotals(windowDays: number): Promise<GscTotals> {
  const data = await post<GscResponse>({
    startDate: isoDaysAgo(windowDays + GSC_LAG_DAYS),
    endDate: isoDaysAgo(GSC_LAG_DAYS),
    dimensions: [],
    type: 'web',
  })
  const r = data?.rows?.[0]
  return {
    impressions: r?.impressions ?? 0,
    clicks: r?.clicks ?? 0,
    ctr: r?.ctr ?? 0,
    position: r?.position ?? 0,
  }
}

// ── Top queries ─────────────────────────────────────────────

export type GscQueryRow = {
  query: string
  page: string
  impressions: number
  clicks: number
  ctr: number
  position: number
}

export async function gscTopQueries(windowDays: number, limit: number): Promise<GscQueryRow[]> {
  const data = await post<GscResponse>({
    startDate: isoDaysAgo(windowDays + GSC_LAG_DAYS),
    endDate: isoDaysAgo(GSC_LAG_DAYS),
    dimensions: ['query', 'page'],
    rowLimit: limit,
    type: 'web',
  })
  return (data?.rows ?? [])
    .map((r) => ({
      query: r.keys?.[0] ?? '',
      page: r.keys?.[1] ?? '',
      impressions: r.impressions ?? 0,
      clicks: r.clicks ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    }))
    .filter((r) => r.query && r.page)
}

// ── Per-page performance + queries (blog drilldown) ─────────

export type GscPagePerf = {
  page: string
  impressions: number
  clicks: number
  ctr: number
  position: number
  /** Ordered by descending impressions, so `[0]` is the top query. */
  topQueries: Array<{
    query: string
    impressions: number
    clicks: number
    position: number
  }>
}

/**
 * Returns performance rolled up per page, plus each page's top queries.
 * One API call — we fetch (page, query) rows with a big rowLimit and
 * do the grouping locally. Cheaper than two round-trips and lets us
 * derive both aggregates from the same underlying data.
 *
 * `queriesPerPage` caps how many queries we surface per page in the UI
 * so a page with 400 unique low-impression queries doesn't dominate.
 */
export async function gscPagePerformance(args: {
  windowDays: number
  queriesPerPage: number
  /** Optional — filter to blog subdomain (or any URL prefix). */
  pagePrefix?: string
}): Promise<GscPagePerf[]> {
  const body: Record<string, unknown> = {
    startDate: isoDaysAgo(args.windowDays + GSC_LAG_DAYS),
    endDate: isoDaysAgo(GSC_LAG_DAYS),
    dimensions: ['page', 'query'],
    // 5000 is GSC's hard cap per request. With ~100 pages × ~50 queries
    // that comfortably covers our current traffic footprint.
    rowLimit: 5000,
    type: 'web',
  }
  if (args.pagePrefix) {
    body.dimensionFilterGroups = [
      {
        filters: [
          { dimension: 'page', operator: 'contains', expression: args.pagePrefix },
        ],
      },
    ]
  }
  const data = await post<GscResponse>(body)
  const rows = data?.rows ?? []

  const byPage = new Map<
    string,
    {
      impressionsSum: number
      clicksSum: number
      // Weighted position — GSC only exposes avg position, so we need
      // to weight it by impressions when rolling up per page.
      posWeighted: number
      queries: Array<{ query: string; impressions: number; clicks: number; position: number }>
    }
  >()

  for (const r of rows) {
    const page = r.keys?.[0] ?? ''
    const query = r.keys?.[1] ?? ''
    if (!page || !query) continue
    const impressions = r.impressions ?? 0
    const clicks = r.clicks ?? 0
    const position = r.position ?? 0
    const bucket = byPage.get(page) ?? {
      impressionsSum: 0,
      clicksSum: 0,
      posWeighted: 0,
      queries: [],
    }
    bucket.impressionsSum += impressions
    bucket.clicksSum += clicks
    bucket.posWeighted += position * impressions
    bucket.queries.push({ query, impressions, clicks, position })
    byPage.set(page, bucket)
  }

  const out: GscPagePerf[] = []
  for (const [page, b] of byPage) {
    b.queries.sort((a, z) => z.impressions - a.impressions)
    out.push({
      page,
      impressions: b.impressionsSum,
      clicks: b.clicksSum,
      ctr: b.impressionsSum > 0 ? b.clicksSum / b.impressionsSum : 0,
      position: b.impressionsSum > 0 ? b.posWeighted / b.impressionsSum : 0,
      topQueries: b.queries.slice(0, args.queriesPerPage),
    })
  }
  out.sort((a, b) => b.impressions - a.impressions)
  return out
}
