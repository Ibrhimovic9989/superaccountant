/**
 * Google Search Console — Search Analytics API client.
 *
 * One method: `fetchSearchAnalytics` — returns rows keyed by
 * (query, page) with impressions / clicks / ctr / position, sorted by
 * clicks descending. That's the raw signal the aggregator massages
 * into `topQueries` and `breakoutCandidates`.
 *
 * Failure policy matches google-analytics.client.ts: return `[]` on
 * transient errors so the aggregator can still write a partial snapshot.
 */

import { loadEnv } from '@sa/config'
import { getAuthClient, lastAuthFailReason } from './google-auth'
import type { InsightsQueryRow } from '../domain/insights-types'

const REQUEST_TIMEOUT_MS = 20_000

const GSC_URL = (site: string) =>
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

export type FetchSearchAnalyticsResult = {
  rows: InsightsQueryRow[]
  totalImpressions: number
  totalClicks: number
  _debug?: unknown
}

export async function fetchSearchAnalytics(args: {
  windowDays: number
  limit: number
}): Promise<FetchSearchAnalyticsResult> {
  const env = loadEnv()
  const site = env.GSC_SITE_URL
  if (!site) return { rows: [], totalImpressions: 0, totalClicks: 0, _debug: { reason: 'no site' } }
  const auth = await getAuthClient()
  if (!auth) return { rows: [], totalImpressions: 0, totalClicks: 0, _debug: { reason: 'no auth', authFail: lastAuthFailReason, siteLen: site.length } }

  // GSC data lags ~2–3 days. Pinning endDate to today returns an empty
  // result set even when the property clearly has traffic — GSC replies
  // "no rows" for date ranges that spill into the pending-processing
  // window. Backing off to today - 3 days is the safe interval that
  // still gives us "yesterday-ish" data.
  const today = new Date()
  const endD = new Date(today)
  endD.setDate(endD.getDate() - 3)
  const end = endD.toISOString().slice(0, 10)
  const startD = new Date(endD)
  startD.setDate(startD.getDate() - args.windowDays)
  const start = startD.toISOString().slice(0, 10)

  console.log('[gsc] request', { site, start, end, rowLimit: args.limit })
  const body = {
    startDate: start,
    endDate: end,
    dimensions: ['query', 'page'],
    rowLimit: args.limit,
    // Web only — we don't run image or discover surfaces.
    type: 'web',
    // Skip the low-signal noise floor. Anything with <2 impressions is
    // a fluke and clutters the leaderboard.
    dimensionFilterGroups: [
      {
        filters: [
          { dimension: 'query', operator: 'notContains', expression: '(not set)' },
        ],
      },
    ],
  }

  let token: string | null | undefined
  try {
    const t = await auth.getAccessToken()
    token = t.token
  } catch (err) {
    console.error('[gsc] access-token failed', { err: (err as Error).message })
    return { rows: [], totalImpressions: 0, totalClicks: 0, _debug: { reason: 'no token', err: (err as Error).message } }
  }
  if (!token) return { rows: [], totalImpressions: 0, totalClicks: 0, _debug: { reason: 'empty token' } }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let data: GscResponse | null
  try {
    const res = await fetch(GSC_URL(site), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      const level = res.status === 403 ? 'warn' : 'error'
      console[level](`[gsc] HTTP ${res.status}`, { body: txt.slice(0, 400) })
      return { rows: [], totalImpressions: 0, totalClicks: 0, _debug: { reason: `http-${res.status}`, siteLen: site.length, siteRaw: JSON.stringify(site).slice(0, 80), body: txt.slice(0, 300), start, end, url: GSC_URL(site) } }
    }
    data = (await res.json()) as GscResponse
    console.log('[gsc] response', { rowCount: data?.rows?.length ?? 0 })
  } catch (err) {
    console.error('[gsc] fetch failed', { err: (err as Error).message })
    return { rows: [], totalImpressions: 0, totalClicks: 0 }
  } finally {
    clearTimeout(timer)
  }

  const rows: InsightsQueryRow[] = []
  let totalImpressions = 0
  let totalClicks = 0
  for (const r of data?.rows ?? []) {
    const query = r.keys?.[0] ?? ''
    const page = r.keys?.[1] ?? ''
    if (!query || !page) continue
    const impressions = r.impressions ?? 0
    const clicks = r.clicks ?? 0
    totalImpressions += impressions
    totalClicks += clicks
    rows.push({
      query,
      page,
      impressions,
      clicks,
      ctr: r.ctr ?? (impressions ? clicks / impressions : 0),
      position: r.position ?? 0,
    })
  }
  return { rows, totalImpressions, totalClicks, _debug: { reason: 'ok', siteLen: site.length, siteRaw: JSON.stringify(site).slice(0, 80), start, end, apiRowCount: data?.rows?.length ?? 0 } }
}
