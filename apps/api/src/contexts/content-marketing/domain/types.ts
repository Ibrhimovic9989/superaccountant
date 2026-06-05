/**
 * Domain types for the content-marketing (SEO/GEO blog writer) context.
 *
 * Per CLAUDE.md §3.4 LSP: these are the shapes the application + infra
 * layers traffic in. Nothing leaks Prisma rows or Azure SDK shapes
 * across the boundary.
 *
 * Vocabulary:
 *   - `ResearchedTopic` — output of the Perplexity step. Multiple come
 *     back per call; the orchestrator picks one.
 *   - `BlogPostDraft`   — output of the Azure OpenAI writing step. Ready
 *     to be persisted as a BlogPost row.
 *   - `AudienceSegment` — one of three: students | graduates | accountants.
 *     Drives both the research seeds and the writer's tone/CTA.
 *   - `Market`          — `'india' | 'ksa'`. Tracks the BlogPost.market
 *     column directly. `'global'` exists in the table but is reserved
 *     for human-authored posts; the agent only writes regional.
 */

export type Market = 'india' | 'ksa'

export type AudienceSegmentKey = 'students' | 'graduates' | 'accountants'

export type UrgencySignal = 'low' | 'medium' | 'high'

/**
 * A single keyword/topic discovered by the researcher. We keep this
 * tight — Perplexity is asked to return only what we actually consume
 * downstream so the JSON validator can be strict.
 */
export type ResearchedTopic = {
  topic: string
  summary: string
  keywords: string[]
  competitorCoverageGap?: string
  urgency: UrgencySignal
}

/**
 * Final shape produced by WritePostService. Matches the BlogPost table
 * columns directly so the repository layer is a 1:1 mapping. We don't
 * persist Arabic yet — the agent ships English first, the AR
 * translation pass is a separate (future) sub-agent.
 */
export type BlogPostDraft = {
  title: string
  slug: string
  subtitle: string
  metaDescription: string
  contentMdx: string
  targetKeywords: string[]
  market: Market
}

/**
 * What the AutoGenerateService returns to the cron controller. Kept
 * minimal so the cron logs stay parseable.
 */
export type AutoGenerateResult = {
  blogPostId: string
  slug: string
  title: string
  audience: AudienceSegmentKey
  market: Market
}
