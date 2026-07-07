/**
 * Blog-insights types. These flow:
 *
 *   GA4/GSC APIs → aggregator → BlogInsightsSnapshot → jsonb column
 *                                                    ↓
 *                                          buildInsightsBriefing()
 *                                                    ↓
 *                                          research + write prompts
 *
 * Kept in `domain/` (framework-free) per CLAUDE.md §3.3 so the
 * briefing builder and prompt injectors can import it without
 * pulling NestJS into the domain layer.
 */

/** One page in the GA4-derived leaderboard. */
export type InsightsPageRow = {
  /** Path portion — e.g. "/gst-two-tier-rate-structure-2026". */
  pagePath: string
  sessions: number
  /** 0–1. Low engagement + high sessions = the topic pulls but the piece is weak. */
  engagementRate: number
  /** Conversions the goal captured (sign-ups, etc). */
  conversions: number
  /** Where visitors came from — e.g. "google / organic". */
  topSource: string
}

/** One query pair from GSC Search Analytics. */
export type InsightsQueryRow = {
  query: string
  page: string
  impressions: number
  clicks: number
  /** 0–1. clicks / impressions. */
  ctr: number
  /** Average position on Google SERP. Lower is better. */
  position: number
}

/**
 * Page ranking between position 4–20 for at least one query — one
 * targeted post can jump these to page 1. This is the highest-leverage
 * signal we can hand the writer agent.
 */
export type BreakoutCandidate = {
  page: string
  /** The query it ranks for, its current position, and what could push it. */
  query: string
  position: number
  impressions: number
  /**
   * "refresh" — same page needs a stronger title/meta/H2 pass.
   * "companion" — write a new post that internally links to this one.
   */
  suggestedAction: 'refresh' | 'companion'
}

/** A published page whose sessions dropped >30% week-over-week. */
export type DecliningPage = {
  pagePath: string
  sessionsRecent: number
  sessionsPrevious: number
  /** Positive when declining — e.g. 0.42 = down 42%. */
  dropRatio: number
}

/** The full snapshot stored in BlogInsights.payload. */
export type BlogInsightsSnapshot = {
  windowDays: number
  refreshedAt: string /* ISO */
  totals: {
    sessions: number
    impressions: number
    clicks: number
    /** clicks / impressions across the whole property. */
    ctr: number
  }
  topPages: InsightsPageRow[]
  topQueries: InsightsQueryRow[]
  breakoutCandidates: BreakoutCandidate[]
  decliningPages: DecliningPage[]
}

/** Empty snapshot — returned when the aggregator can't reach GA/GSC yet. */
export function emptySnapshot(windowDays = 28): BlogInsightsSnapshot {
  return {
    windowDays,
    refreshedAt: new Date().toISOString(),
    totals: { sessions: 0, impressions: 0, clicks: 0, ctr: 0 },
    topPages: [],
    topQueries: [],
    breakoutCandidates: [],
    decliningPages: [],
  }
}
