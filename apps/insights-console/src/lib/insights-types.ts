/**
 * Types shared with the writer agent's insights context.
 * Mirrored from apps/api/src/contexts/content-marketing/domain/insights-types.ts
 * so this app can render the same jsonb payload the agent reads.
 *
 * If the shape changes there, update here too. Small enough that
 * duplication beats reaching into another app's src.
 */

export type InsightsPageRow = {
  pagePath: string
  sessions: number
  engagementRate: number
  conversions: number
  topSource: string
}

export type InsightsQueryRow = {
  query: string
  page: string
  impressions: number
  clicks: number
  ctr: number
  position: number
}

export type BreakoutCandidate = {
  page: string
  query: string
  position: number
  impressions: number
  suggestedAction: 'refresh' | 'companion'
}

export type DecliningPage = {
  pagePath: string
  sessionsRecent: number
  sessionsPrevious: number
  dropRatio: number
}

export type BlogInsightsSnapshot = {
  windowDays: number
  refreshedAt: string
  totals: {
    sessions: number
    impressions: number
    clicks: number
    ctr: number
  }
  topPages: InsightsPageRow[]
  topQueries: InsightsQueryRow[]
  breakoutCandidates: BreakoutCandidate[]
  decliningPages: DecliningPage[]
}
