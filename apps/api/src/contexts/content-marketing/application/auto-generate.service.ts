/**
 * AutoGenerateService — the orchestrator. Single public method
 * `execute()` runs the full pipeline:
 *
 *   1. Decide audience + market via the rotation rule.
 *   2. Load the 30-day "already covered" set from BlogTopic.
 *   3. Ask Perplexity for fresh candidates.
 *   4. Pick the highest-urgency non-overlapping candidate.
 *   5. Persist it as a queued BlogTopic.
 *   6. Hand off to WritePostService for the Azure OpenAI write.
 *   7. Persist as a published BlogPost, mark the topic 'used'.
 *
 * Failure handling:
 *   - Steps 3-4 returning empty → cron throws "no fresh candidate" so
 *     ops gets alerted; we deliberately do NOT publish a stale fallback.
 *   - Step 6 throwing (e.g. Azure quota) → the queued BlogTopic stays
 *     in 'queued' status. The next cron run can pick it up by reading
 *     queued topics first (future enhancement; out of scope here).
 *   - Step 7 throwing (e.g. DB connection) → the BlogTopic row is
 *     untouched, so a retry won't double-publish.
 *
 * Per CLAUDE.md §10 (claude-code parity): tools are units of capability
 * and orchestrators only sequence them. This file does no model calls
 * itself — research and write are delegated.
 */

import { Injectable } from '@nestjs/common'
import type { AutoGenerateResult, ResearchedTopic } from '../domain/types'
import { rotate, weekLabel } from '../domain/rotation'
import { ResearchTopicsService } from './research-topics.service'
import { WritePostService } from './write-post.service'
import { BlogRepository, SEO_AGENT_AUTHOR_ID } from '../infrastructure/blog.repository'

const RECENT_TOPIC_WINDOW_DAYS = 30

@Injectable()
export class AutoGenerateService {
  constructor(
    private readonly research: ResearchTopicsService,
    private readonly writer: WritePostService,
    private readonly repo: BlogRepository,
  ) {}

  /**
   * Optional `now` override exists so the cron endpoint (or a manual
   * "force run for date X" test) can drive the rotation without having
   * to monkey-patch Date. Defaults to `new Date()`.
   */
  async execute(input: { now?: Date } = {}): Promise<AutoGenerateResult> {
    const now = input.now ?? new Date()
    const { audience, market } = rotate(now)
    const wl = weekLabel(now)

    this.log('plan', { audience, market, weekLabel: wl })

    // 1. Recent-topic dedupe set.
    const excludeKeys = await this.loadExcludeKeys()

    // 2. Research.
    const candidates = await this.research.execute({
      audience,
      market,
      weekLabel: wl,
      excludeKeys,
    })
    if (candidates.length === 0) {
      this.log('no-candidates', { audience, market })
      throw new Error('[auto-generate] no fresh topic candidates after dedupe')
    }

    // 3. Pick — the research service already sorted by urgency, so
    // candidates[0] is the highest-priority fresh option. The length
    // check above guarantees this isn't undefined.
    const chosen: ResearchedTopic = candidates[0]
    this.log('chosen', {
      audience,
      market,
      topic: chosen.topic,
      urgency: chosen.urgency,
    })

    // 4. Persist the topic in 'queued' state. If this fails we abort
    // before incurring the Azure cost.
    const { id: topicId } = await this.repo.saveTopic({
      topic: chosen,
      targetMarket: market,
      targetAudience: audience,
    })

    // 5. Write.
    const draft = await this.writer.execute({ topic: chosen, audience, market })

    // 6. Publish. Wrap separately so a transient DB write doesn't leave
    // the topic in 'used' but with no post attached.
    let savedPost: { id: string; slug: string }
    try {
      savedPost = await this.repo.savePost({
        draft,
        authorAgentId: SEO_AGENT_AUTHOR_ID,
      })
    } catch (err) {
      console.error('[auto-generate] savePost failed — topic remains queued', {
        topicId,
        err: (err as Error).message,
      })
      throw err
    }

    // 7. Back-link the topic.
    try {
      await this.repo.markTopicUsed(topicId, savedPost.id)
    } catch (err) {
      // Non-fatal: the post is published; the topic just doesn't track
      // its consumer. Log loudly so an admin can fix manually.
      console.error('[auto-generate] markTopicUsed failed (post is still live)', {
        topicId,
        blogPostId: savedPost.id,
        err: (err as Error).message,
      })
    }

    this.log('published', {
      audience,
      market,
      blogPostId: savedPost.id,
      slug: savedPost.slug,
    })

    return {
      blogPostId: savedPost.id,
      slug: savedPost.slug,
      title: draft.title,
      audience,
      market,
    }
  }

  // ── helpers ──────────────────────────────────────────────────

  private async loadExcludeKeys(): Promise<Set<string>> {
    try {
      return await this.repo.findRecentTopicKeys(RECENT_TOPIC_WINDOW_DAYS)
    } catch (err) {
      // If we can't compute the dedupe set, fail closed — better to
      // skip a run than to publish a duplicate.
      console.error('[auto-generate] dedupe lookup failed', {
        err: (err as Error).message,
      })
      throw err
    }
  }

  private log(
    event: 'plan' | 'chosen' | 'no-candidates' | 'published',
    payload: Record<string, unknown>,
  ): void {
    // Structured one-line log so Supabase log aggregator can grep.
    console.log(`[auto-generate] ${event}`, JSON.stringify(payload))
  }
}

