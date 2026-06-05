/**
 * Blog repository — writes against the BlogPost + BlogTopic tables
 * created by the sibling `apps/blog` foundation migration
 * (`packages/db/scripts/add-blog-tables.mjs`).
 *
 * Tables are NOT declared in schema.prisma yet, matching the loyalty
 * pattern (CLAUDE.md §3.5 — repos may use raw SQL when the schema
 * lives outside the Prisma client). All access is via $queryRaw /
 * $executeRaw.
 *
 * Idempotency story:
 *   - The (slug) column on BlogPost is UNIQUE. INSERT collisions raise
 *     PG error 23505; on retry we append a short cuid-ish suffix.
 *   - BlogTopic gets a status row per chosen topic. The 30-day window
 *     query filters by `status='used'` and the `usedAt` timestamp so a
 *     queued-but-not-yet-used row doesn't block the candidate pool.
 */

import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { prisma } from '@sa/db'
import type { BlogPostDraft, Market, ResearchedTopic } from '../domain/types'

/** Author tag stored on agent-written posts. Versioned so we can audit later. */
export const SEO_AGENT_AUTHOR_ID = 'seo-geo-writer-v1'

@Injectable()
export class BlogRepository {
  /**
   * Returns a set of topic-key strings used in the last `afterDays` days.
   * The 'key' is a lowercased, whitespace-normalised version of the
   * topic title — robust enough to catch near-duplicates like
   * "GST Return Filing 2026" vs "gst return filing  2026".
   */
  async findRecentTopicKeys(afterDays = 30): Promise<Set<string>> {
    const cutoff = new Date(Date.now() - afterDays * 24 * 60 * 60 * 1000)
    const rows = await prisma.$queryRaw<Array<{ topic: string }>>`
      SELECT "topic"
      FROM "BlogTopic"
      WHERE "status" IN ('used', 'queued')
        AND COALESCE("usedAt", "generatedAt") >= ${cutoff}
    `
    return new Set(rows.map((r) => topicKey(r.topic)))
  }

  /**
   * Persist a researched topic as a `BlogTopic` row in status='queued'.
   * Returns the new id so the orchestrator can later flip it to 'used'.
   */
  async saveTopic(args: {
    topic: ResearchedTopic
    targetMarket: Market
    targetAudience: 'students' | 'graduates' | 'accountants'
  }): Promise<{ id: string }> {
    const id = randomUUID()
    const marketResearch = JSON.stringify({
      summary: args.topic.summary,
      urgency: args.topic.urgency,
      competitorCoverageGap: args.topic.competitorCoverageGap ?? null,
    })
    await prisma.$executeRaw`
      INSERT INTO "BlogTopic"
        ("id", "topic", "sourceKeywords", "marketResearch", "status",
         "targetMarket", "targetAudience", "generatedAt")
      VALUES
        (${id}, ${args.topic.topic}, ${args.topic.keywords}::text[],
         ${marketResearch}::jsonb, 'queued',
         ${args.targetMarket}, ${args.targetAudience}, NOW())
    `
    return { id }
  }

  /**
   * Mark a queued topic as used + back-link to the blog post that
   * consumed it. Idempotent at the DB level (just updates by id).
   */
  async markTopicUsed(topicId: string, blogPostId: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE "BlogTopic"
      SET "status" = 'used',
          "usedAt" = NOW(),
          "usedByBlogPostId" = ${blogPostId}
      WHERE "id" = ${topicId}
    `
  }

  /**
   * Persist a BlogPostDraft as a BlogPost row. status='published',
   * publishedAt=NOW(). Returns id + final slug (which may differ from
   * the input slug if a uniqueness collision forced a retry).
   *
   * Slug collision handling: on PG 23505, append `-<short token>` and
   * retry once. If that also collides, give up — the second token is
   * 8 random hex chars so a collision is effectively impossible.
   */
  async savePost(args: {
    draft: BlogPostDraft
    authorAgentId: string
  }): Promise<{ id: string; slug: string }> {
    const id = randomUUID()
    try {
      await this.insertPost(id, args.draft.slug, args.draft, args.authorAgentId)
      return { id, slug: args.draft.slug }
    } catch (err) {
      if (!isUniqueViolation(err)) throw err
      // Slug clash — append a short token and retry.
      const altSlug = `${args.draft.slug}-${shortToken()}`
      console.warn('[blog.repository] slug clash, retrying with suffix', {
        original: args.draft.slug,
        retry: altSlug,
      })
      try {
        await this.insertPost(id, altSlug, args.draft, args.authorAgentId)
        return { id, slug: altSlug }
      } catch (err2) {
        if (!isUniqueViolation(err2)) throw err2
        const altSlug2 = `${args.draft.slug}-${shortToken()}-${shortToken()}`
        await this.insertPost(id, altSlug2, args.draft, args.authorAgentId)
        return { id, slug: altSlug2 }
      }
    }
  }

  // ── internal ─────────────────────────────────────────────────

  private async insertPost(
    id: string,
    slug: string,
    draft: BlogPostDraft,
    authorAgentId: string,
  ): Promise<void> {
    await prisma.$executeRaw`
      INSERT INTO "BlogPost"
        ("id", "slug", "titleEn", "subtitleEn", "contentEnMdx",
         "metaDescriptionEn", "status", "publishedAt",
         "authorAgentId", "targetKeywords", "market",
         "viewCount", "signupConversions")
      VALUES
        (${id}, ${slug}, ${draft.title}, ${draft.subtitle}, ${draft.contentMdx},
         ${draft.metaDescription}, 'published', NOW(),
         ${authorAgentId}, ${draft.targetKeywords}::text[], ${draft.market},
         0, 0)
    `
  }
}

// ── pure helpers ──────────────────────────────────────────────

/** Lowercase + collapse whitespace + strip surrounding punctuation. */
function topicKey(topic: string): string {
  return topic.toLowerCase().replace(/\s+/g, ' ').trim()
}

function isUniqueViolation(err: unknown): boolean {
  const msg = (err as Error | undefined)?.message ?? ''
  return msg.includes('23505') || /unique/i.test(msg)
}

/** 8 hex chars from the randomUUID() output — collision-safe enough for a slug suffix. */
function shortToken(): string {
  return randomUUID().replace(/-/g, '').slice(0, 8)
}
