/**
 * RefreshInsightsService — orchestrator that pulls GA4 + GSC once a
 * day, derives the "breakout candidates" + "declining pages" lists,
 * and appends a BlogInsights row.
 *
 * Called from the /content-marketing/insights/refresh endpoint (which
 * the Supabase cron hits) and manually from admin UI when we want a
 * fresh snapshot on demand.
 *
 * Per CLAUDE.md §3.4 SRP: one job — produce a fresh snapshot.
 * All the reasoning about "how the writer agent uses this" lives in
 * insights-briefing.ts, which is called on the read side.
 *
 * Failure mode: if GA4 or GSC return zero rows we STILL save a
 * snapshot (with empty arrays + the totals we do have). That way
 * `findLatestSnapshot()` never returns null after the first
 * successful refresh — the writer just gets a briefing that says
 * "no data yet", which is honest and preferable to a null branch.
 */

import { Inject, Injectable } from '@nestjs/common'
import { fetchSessionsPerPage, fetchTopPages } from '../infrastructure/google-analytics.client'
import { fetchSearchAnalytics } from '../infrastructure/search-console.client'
import { InsightsRepository } from '../infrastructure/insights.repository'
import type {
  BlogInsightsSnapshot,
  BreakoutCandidate,
  DecliningPage,
  InsightsPageRow,
  InsightsQueryRow,
} from '../domain/insights-types'

/** Window over which we roll up sessions/impressions. */
const WINDOW_DAYS = 28
/** How many pages / queries to hand the writer agent. */
const TOP_N = 20
/** Position range where a targeted post/refresh has the best leverage. */
const BREAKOUT_MIN_POSITION = 4
const BREAKOUT_MAX_POSITION = 20
/** Impressions floor for a breakout candidate — anything lower is noise. */
const BREAKOUT_MIN_IMPRESSIONS = 30
/** WoW drop that qualifies a page as "declining". */
const DECLINE_MIN_DROP_RATIO = 0.3
/** Sessions floor so we don't flag a page that dropped from 3 to 1. */
const DECLINE_MIN_RECENT_SESSIONS = 10

export type RefreshInsightsResult = {
  windowDays: number
  totalSessions: number
  totalImpressions: number
  totalClicks: number
  _debug?: unknown
  topPageCount: number
  topQueryCount: number
  breakoutCount: number
  decliningCount: number
}

@Injectable()
export class RefreshInsightsService {
  constructor(
    @Inject(InsightsRepository) private readonly repo: InsightsRepository,
  ) {}

  async execute(): Promise<RefreshInsightsResult> {
    // Kick off all three network calls in parallel — they're
    // independent and each takes ~1–3s.
    const [topPagesResult, gsc, sessionsPrev] = await Promise.all([
      fetchTopPages({ windowDays: WINDOW_DAYS, limit: TOP_N * 3 }),
      fetchSearchAnalytics({ windowDays: WINDOW_DAYS, limit: 400 }),
      // For the WoW drop calculation we need last 7 days vs the 7 days
      // before that. Both come out of GA4 as pagePath → sessions.
      fetchSessionsPerPage({ startDaysAgo: 14, endDaysAgo: 8, limit: 200 }),
    ])
    const sessionsRecent = await fetchSessionsPerPage({
      startDaysAgo: 7,
      endDaysAgo: 1,
      limit: 200,
    })

    const topPages = topPagesResult.rows.slice(0, TOP_N)
    const topQueries = pickTopQueries(gsc.rows, TOP_N)
    const breakoutCandidates = pickBreakoutCandidates(gsc.rows)
    const decliningPages = pickDecliningPages(sessionsRecent, sessionsPrev)

    const snapshot: BlogInsightsSnapshot = {
      windowDays: WINDOW_DAYS,
      refreshedAt: new Date().toISOString(),
      totals: {
        sessions: topPagesResult.totalSessions,
        impressions: gsc.totalImpressions,
        clicks: gsc.totalClicks,
        ctr: gsc.totalImpressions > 0 ? gsc.totalClicks / gsc.totalImpressions : 0,
      },
      topPages,
      topQueries,
      breakoutCandidates,
      decliningPages,
    }

    await this.repo.saveSnapshot(snapshot)

    console.log(
      '[refresh-insights] saved',
      JSON.stringify({
        sessions: snapshot.totals.sessions,
        impressions: snapshot.totals.impressions,
        clicks: snapshot.totals.clicks,
        topPages: snapshot.topPages.length,
        topQueries: snapshot.topQueries.length,
        breakouts: snapshot.breakoutCandidates.length,
        declining: snapshot.decliningPages.length,
      }),
    )

    return {
      windowDays: snapshot.windowDays,
      totalSessions: snapshot.totals.sessions,
      totalImpressions: snapshot.totals.impressions,
      totalClicks: snapshot.totals.clicks,
      topPageCount: snapshot.topPages.length,
      topQueryCount: snapshot.topQueries.length,
      breakoutCount: snapshot.breakoutCandidates.length,
      decliningCount: snapshot.decliningPages.length,
      _debug: {
        gsc: (gsc as { _debug?: unknown })._debug ?? null,
        gscRawRowCount: gsc.rows.length,
        topPagesRowCount: topPagesResult.rows.length,
      },
    }
  }
}

// ── pure derivations ─────────────────────────────────────────

function pickTopQueries(rows: InsightsQueryRow[], n: number): InsightsQueryRow[] {
  // Roll up per query (a query can appear on multiple pages). Pick the
  // (query, page) pair with the most impressions as the canonical row
  // for that query.
  const byQuery = new Map<string, InsightsQueryRow>()
  for (const r of rows) {
    const existing = byQuery.get(r.query)
    if (!existing || r.impressions > existing.impressions) {
      byQuery.set(r.query, r)
    }
  }
  const merged = [...byQuery.values()]
  merged.sort((a, b) => b.impressions - a.impressions)
  return merged.slice(0, n)
}

function pickBreakoutCandidates(rows: InsightsQueryRow[]): BreakoutCandidate[] {
  // A (query, page) where position ∈ [4, 20] and impressions ≥ floor.
  // Suggest 'refresh' when the page already ranks for the query
  // (its main topic aligns); 'companion' when the page ranks for
  // something tangential and a dedicated post would rank better.
  const candidates: BreakoutCandidate[] = []
  for (const r of rows) {
    if (
      r.position < BREAKOUT_MIN_POSITION ||
      r.position > BREAKOUT_MAX_POSITION ||
      r.impressions < BREAKOUT_MIN_IMPRESSIONS
    ) {
      continue
    }
    // Heuristic: if the query's key words appear in the page path we
    // assume the page is "about" the query → refresh. Otherwise a
    // companion post would rank better.
    const suggestedAction: BreakoutCandidate['suggestedAction'] = pageMentionsQuery(r.page, r.query)
      ? 'refresh'
      : 'companion'
    candidates.push({
      page: r.page,
      query: r.query,
      position: r.position,
      impressions: r.impressions,
      suggestedAction,
    })
  }
  // Order by impressions × (1 / position) — high-volume + close-to-page-1 first.
  candidates.sort((a, b) => b.impressions / b.position - a.impressions / a.position)
  return candidates.slice(0, TOP_N)
}

function pageMentionsQuery(pageUrl: string, query: string): boolean {
  const path = pageUrl.replace(/^https?:\/\/[^/]+/, '').toLowerCase()
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2)
  if (tokens.length === 0) return false
  // Match if at least half the multi-char tokens appear in the path.
  const hits = tokens.filter((t) => path.includes(t)).length
  return hits / tokens.length >= 0.5
}

function pickDecliningPages(
  recent: Map<string, number>,
  prev: Map<string, number>,
): DecliningPage[] {
  const out: DecliningPage[] = []
  for (const [pagePath, recentSessions] of recent) {
    if (recentSessions < DECLINE_MIN_RECENT_SESSIONS) continue
    const prevSessions = prev.get(pagePath) ?? 0
    if (prevSessions === 0) continue // brand-new page; no baseline to drop from.
    const drop = (prevSessions - recentSessions) / prevSessions
    if (drop < DECLINE_MIN_DROP_RATIO) continue
    out.push({
      pagePath,
      sessionsRecent: recentSessions,
      sessionsPrevious: prevSessions,
      dropRatio: drop,
    })
  }
  out.sort((a, b) => b.dropRatio - a.dropRatio)
  return out.slice(0, TOP_N)
}

// Suppress unused-warning for the imported type used only in the signatures above.
export type { InsightsPageRow }
