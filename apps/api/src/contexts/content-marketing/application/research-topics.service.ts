/**
 * ResearchTopicsService — application-layer wrapper around the
 * Perplexity client. Owns the (audience, market, weekLabel) ->
 * topic-list translation, including the recent-topic dedupe filter.
 *
 * Per CLAUDE.md §3.4 SRP: one job — return fresh, non-duplicate topic
 * candidates ordered by urgency (high → medium → low).
 */

import { Injectable } from '@nestjs/common'
import type { AudienceSegmentKey, Market, ResearchedTopic } from '../domain/types'
import { researchTopics, DEFAULT_CANDIDATE_COUNT } from '../infrastructure/perplexity.client'

@Injectable()
export class ResearchTopicsService {
  /**
   * Fetch fresh candidates and filter out anything already covered in
   * the recent window. Returns at most `count` items, sorted by urgency
   * descending so the orchestrator's first pick is the most time-
   * sensitive option.
   */
  async execute(args: {
    audience: AudienceSegmentKey
    market: Market
    weekLabel: string
    excludeKeys: Set<string>
    count?: number
  }): Promise<ResearchedTopic[]> {
    const requested = args.count ?? DEFAULT_CANDIDATE_COUNT
    const raw = await researchTopics({
      audience: args.audience,
      market: args.market,
      weekLabel: args.weekLabel,
      count: requested,
    })

    const fresh = raw.filter((t) => !args.excludeKeys.has(normalise(t.topic)))
    fresh.sort(byUrgency)
    return fresh
  }
}

// ── pure helpers ──────────────────────────────────────────────

function normalise(topic: string): string {
  return topic.toLowerCase().replace(/\s+/g, ' ').trim()
}

const URGENCY_RANK: Record<ResearchedTopic['urgency'], number> = {
  high: 3,
  medium: 2,
  low: 1,
}

function byUrgency(a: ResearchedTopic, b: ResearchedTopic): number {
  return URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency]
}
