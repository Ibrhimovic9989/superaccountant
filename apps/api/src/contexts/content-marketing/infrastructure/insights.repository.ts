/**
 * BlogInsights persistence — raw SQL against the table created by
 * packages/db/scripts/add-blog-insights-table.mjs.
 *
 * Two operations:
 *   - saveSnapshot: append a new row (one per refresh).
 *   - findLatestSnapshot: return the newest row for a given market.
 *
 * Mirrors the raw-SQL + prisma-singleton import pattern used by
 * blog.repository.ts in this context.
 */

import { Injectable } from '@nestjs/common'
import { prisma } from '@sa/db'
import type { BlogInsightsSnapshot } from '../domain/insights-types'

const DEFAULT_MARKET = 'all' as const

/** cuid-ish id, mirrors apps/blog/src/lib/blog/store.ts newId(). */
function newId(): string {
  return (
    'c' +
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  )
}

@Injectable()
export class InsightsRepository {
  async saveSnapshot(snapshot: BlogInsightsSnapshot, market: string = DEFAULT_MARKET): Promise<void> {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "BlogInsights" (
         "id", "market", "payload", "windowDays",
         "totalSessions", "totalImpressions", "totalClicks",
         "refreshedAt"
       ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8)`,
      newId(),
      market,
      JSON.stringify(snapshot),
      snapshot.windowDays,
      Math.round(snapshot.totals.sessions),
      Math.round(snapshot.totals.impressions),
      Math.round(snapshot.totals.clicks),
      new Date(snapshot.refreshedAt),
    )
  }

  /**
   * Latest snapshot for the given market. Returns null when the table
   * is empty (fresh install) — callers treat null as "no insights yet,
   * proceed without briefing".
   */
  async findLatestSnapshot(market: string = DEFAULT_MARKET): Promise<BlogInsightsSnapshot | null> {
    const rows = await prisma.$queryRawUnsafe<{ payload: BlogInsightsSnapshot }[]>(
      `SELECT "payload" FROM "BlogInsights"
        WHERE "market" = $1
        ORDER BY "refreshedAt" DESC
        LIMIT 1`,
      market,
    )
    return rows[0]?.payload ?? null
  }
}
