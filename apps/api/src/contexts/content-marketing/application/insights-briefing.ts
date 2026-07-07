/**
 * Pure formatter: BlogInsightsSnapshot → short markdown briefing.
 *
 * Injected into both the research prompt (to prioritise topics that
 * data-driven signal suggests) and the write prompt (to lean on
 * proven keywords + refresh under-performing pages). The briefing is
 * capped to ~1500 tokens so it doesn't blow the context budget on the
 * writer's ~4k-token generation.
 *
 * No I/O. No NestJS. Domain-level pure function so a unit test can
 * feed a hand-crafted snapshot and diff the string.
 */

import type { BlogInsightsSnapshot, InsightsQueryRow } from '../domain/insights-types'

/** How many rows to hand the writer. Enough to be useful, small enough to not dilute the prompt. */
const BRIEFING_TOP_PAGES = 8
const BRIEFING_TOP_QUERIES = 12
const BRIEFING_BREAKOUTS = 6
const BRIEFING_DECLINING = 4

/**
 * Returns a markdown briefing, or an empty string when the snapshot
 * is falsy / empty. Empty-string return is deliberate — callers can
 * concatenate unconditionally without a null-guard.
 */
export function buildInsightsBriefing(snapshot: BlogInsightsSnapshot | null): string {
  if (!snapshot) return ''
  if (snapshot.topPages.length === 0 && snapshot.topQueries.length === 0) {
    return [
      '## State of the blog (past 28 days)',
      '',
      '(No GA4/GSC data available yet — this could be a brand-new property or',
      "the service-account grant hasn't propagated. Proceed on editorial",
      'judgement.)',
    ].join('\n')
  }

  const sections: string[] = []
  sections.push('## State of the blog (past 28 days)')
  sections.push('')
  sections.push(formatTotals(snapshot))

  if (snapshot.topPages.length > 0) {
    sections.push('')
    sections.push('### Best-performing pages')
    sections.push('_(Sessions · engagement% · conversions · top traffic source)_')
    for (const p of snapshot.topPages.slice(0, BRIEFING_TOP_PAGES)) {
      sections.push(
        `- \`${p.pagePath}\` — ${p.sessions} sessions · ${(p.engagementRate * 100).toFixed(0)}% eng · ${p.conversions} conv · via ${p.topSource}`,
      )
    }
  }

  if (snapshot.topQueries.length > 0) {
    sections.push('')
    sections.push('### Top queries bringing us visibility')
    sections.push('_(Impressions · CTR% · avg position — position <10 = page 1)_')
    for (const q of snapshot.topQueries.slice(0, BRIEFING_TOP_QUERIES)) {
      sections.push(formatQueryRow(q))
    }
  }

  if (snapshot.breakoutCandidates.length > 0) {
    sections.push('')
    sections.push('### One-nudge-from-page-1 (highest leverage right now)')
    sections.push('_Position 4–20 with real impressions — write toward these._')
    for (const c of snapshot.breakoutCandidates.slice(0, BRIEFING_BREAKOUTS)) {
      const action = c.suggestedAction === 'refresh' ? '_(refresh existing)_' : '_(new companion post)_'
      sections.push(
        `- **"${c.query}"** → ${c.page} — pos ${c.position.toFixed(1)}, ${c.impressions} impr ${action}`,
      )
    }
  }

  if (snapshot.decliningPages.length > 0) {
    sections.push('')
    sections.push('### Declining pages (WoW)')
    sections.push('_Consider a refresh or an internal link boost from the next post._')
    for (const d of snapshot.decliningPages.slice(0, BRIEFING_DECLINING)) {
      sections.push(
        `- \`${d.pagePath}\` — ${d.sessionsRecent} vs ${d.sessionsPrevious} sess (${(d.dropRatio * 100).toFixed(0)}% drop)`,
      )
    }
  }

  return sections.join('\n')
}

function formatTotals(s: BlogInsightsSnapshot): string {
  return [
    `- **Sessions:** ${s.totals.sessions.toLocaleString()}`,
    `- **Impressions:** ${s.totals.impressions.toLocaleString()}`,
    `- **Clicks:** ${s.totals.clicks.toLocaleString()} (${(s.totals.ctr * 100).toFixed(2)}% CTR)`,
  ].join('\n')
}

function formatQueryRow(q: InsightsQueryRow): string {
  return `- \`${q.query}\` — ${q.impressions} impr · ${(q.ctr * 100).toFixed(1)}% CTR · pos ${q.position.toFixed(1)}`
}
