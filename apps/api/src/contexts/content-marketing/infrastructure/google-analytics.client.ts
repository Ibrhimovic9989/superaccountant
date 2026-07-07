/**
 * GA4 Data API client — one method: `fetchTopPages`.
 *
 * We use the REST endpoint (analyticsdata.googleapis.com/v1beta) with a
 * JWT-signed access token rather than pulling `@google-analytics/data`.
 * That saves ~40 MB in the Vercel bundle and gives us straightforward
 * JSON we can debug in server logs.
 *
 * Failure policy: EVERY entry point returns an empty array on transient
 * failure so the aggregator can still write a partial snapshot. GA4
 * permission grants can take up to 24h to propagate the first time —
 * the caller mustn't crash while that's outstanding.
 */

import { loadEnv } from '@sa/config'
import { getAuthClient } from './google-auth'
import type { InsightsPageRow } from '../domain/insights-types'

const GA4_URL = (propertyId: string) =>
  `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`

const REQUEST_TIMEOUT_MS = 20_000

type Ga4Response = {
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>
    metricValues?: Array<{ value?: string }>
  }>
  totals?: Array<{ metricValues?: Array<{ value?: string }> }>
}

/** Top blog pages by sessions in the window, with engagement + attribution. */
export async function fetchTopPages(args: {
  windowDays: number
  limit: number
}): Promise<{ rows: InsightsPageRow[]; totalSessions: number }> {
  const env = loadEnv()
  const propertyId = env.GA4_PROPERTY_ID
  if (!propertyId) return { rows: [], totalSessions: 0 }
  const auth = await getAuthClient()
  if (!auth) return { rows: [], totalSessions: 0 }

  const body = {
    dateRanges: [{ startDate: `${args.windowDays}daysAgo`, endDate: 'today' }],
    dimensions: [
      { name: 'pagePath' },
      { name: 'sessionSourceMedium' },
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'engagementRate' },
      { name: 'conversions' },
    ],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: String(args.limit),
    keepEmptyRows: false,
  }

  const data = await postJson<Ga4Response>({
    url: GA4_URL(propertyId),
    auth,
    body,
    context: 'ga4.runReport',
  })
  if (!data) return { rows: [], totalSessions: 0 }

  // GA4 emits ONE row per (pagePath, sessionSourceMedium). We roll up to
  // "top source per page" client-side so the writer agent gets a clean
  // per-page picture. Weighted mean for engagementRate so a page with
  // 100 sessions at 60% and 10 sessions at 20% comes out to ~57%,
  // not 40%.
  const byPage = new Map<
    string,
    {
      sessions: number
      engagementSessionsSum: number
      conversions: number
      sources: Map<string, number>
    }
  >()
  for (const row of data.rows ?? []) {
    const pagePath = row.dimensionValues?.[0]?.value ?? ''
    const source = row.dimensionValues?.[1]?.value ?? '(unknown)'
    const sessions = Number(row.metricValues?.[0]?.value ?? '0')
    const engagementRate = Number(row.metricValues?.[1]?.value ?? '0')
    const conversions = Number(row.metricValues?.[2]?.value ?? '0')
    if (!pagePath || sessions === 0) continue
    const bucket = byPage.get(pagePath) ?? {
      sessions: 0,
      engagementSessionsSum: 0,
      conversions: 0,
      sources: new Map(),
    }
    bucket.sessions += sessions
    bucket.engagementSessionsSum += engagementRate * sessions
    bucket.conversions += conversions
    bucket.sources.set(source, (bucket.sources.get(source) ?? 0) + sessions)
    byPage.set(pagePath, bucket)
  }

  const rows: InsightsPageRow[] = []
  for (const [pagePath, b] of byPage) {
    const topSource = [...b.sources.entries()].sort((a, z) => z[1] - a[1])[0]?.[0] ?? '(unknown)'
    rows.push({
      pagePath,
      sessions: b.sessions,
      engagementRate: b.sessions > 0 ? b.engagementSessionsSum / b.sessions : 0,
      conversions: b.conversions,
      topSource,
    })
  }
  rows.sort((a, b) => b.sessions - a.sessions)
  const totalSessions = rows.reduce((s, r) => s + r.sessions, 0)
  return { rows: rows.slice(0, args.limit), totalSessions }
}

/**
 * Per-page session totals for the "declining pages" comparison. We call
 * once for the recent window and once for the previous window and diff
 * in the service layer.
 */
export async function fetchSessionsPerPage(args: {
  startDaysAgo: number
  endDaysAgo: number
  limit: number
}): Promise<Map<string, number>> {
  const env = loadEnv()
  const propertyId = env.GA4_PROPERTY_ID
  if (!propertyId) return new Map()
  const auth = await getAuthClient()
  if (!auth) return new Map()

  const body = {
    dateRanges: [
      {
        startDate: `${args.startDaysAgo}daysAgo`,
        endDate: `${args.endDaysAgo}daysAgo`,
      },
    ],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: String(args.limit),
    keepEmptyRows: false,
  }
  const data = await postJson<Ga4Response>({
    url: GA4_URL(propertyId),
    auth,
    body,
    context: 'ga4.sessionsPerPage',
  })
  const out = new Map<string, number>()
  for (const row of data?.rows ?? []) {
    const pagePath = row.dimensionValues?.[0]?.value ?? ''
    const sessions = Number(row.metricValues?.[0]?.value ?? '0')
    if (pagePath) out.set(pagePath, sessions)
  }
  return out
}

// ── HTTP helper ──────────────────────────────────────────────

async function postJson<T>(args: {
  url: string
  auth: Awaited<ReturnType<typeof getAuthClient>>
  body: unknown
  context: string
}): Promise<T | null> {
  if (!args.auth) return null
  let token: string | null | undefined
  try {
    const t = await args.auth.getAccessToken()
    token = t.token
  } catch (err) {
    console.error(`[${args.context}] access-token fetch failed`, {
      err: (err as Error).message,
    })
    return null
  }
  if (!token) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(args.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args.body),
      signal: controller.signal,
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      // 403 during the first 24h after granting is normal (GA4
      // propagation). Log at WARN so ops can distinguish it from a
      // hard failure.
      const level = res.status === 403 ? 'warn' : 'error'
      console[level](`[${args.context}] HTTP ${res.status}`, {
        body: txt.slice(0, 400),
      })
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.error(`[${args.context}] fetch failed`, { err: (err as Error).message })
    return null
  } finally {
    clearTimeout(timer)
  }
}
