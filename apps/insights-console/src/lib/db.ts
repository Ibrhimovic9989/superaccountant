import 'server-only'
import { prisma } from '@sa/db'
import type { BlogInsightsSnapshot } from './insights-types'

/**
 * Supabase reads for the dashboard. Raw SQL because BlogPost, BlogTopic
 * and BlogInsights live outside the Prisma schema (see
 * packages/db/scripts/add-blog-tables.mjs + add-blog-insights-table.mjs).
 */

export type PublishedPostRow = {
  id: string
  slug: string
  titleEn: string
  market: string
  authorAgentId: string | null
  targetKeywords: string[]
  publishedAt: Date | null
  createdAt: Date
}

/** Latest published posts, newest first. */
export async function listRecentPosts(limit = 20): Promise<PublishedPostRow[]> {
  const rows = await prisma.$queryRawUnsafe<PublishedPostRow[]>(
    `SELECT "id", "slug", "titleEn", "market", "authorAgentId",
            "targetKeywords", "publishedAt", "createdAt"
       FROM "BlogPost"
      WHERE "status" = 'published' AND "deletedAt" IS NULL
      ORDER BY COALESCE("publishedAt", "createdAt") DESC
      LIMIT $1`,
    limit,
  )
  return rows
}

/** Grand totals, plus a daily count for a small posts-per-day sparkline later. */
export type PostSummary = {
  totalPublished: number
  publishedLast30d: number
  publishedLast7d: number
  agentAuthored: number
}

export async function postSummary(): Promise<PostSummary> {
  const rows = await prisma.$queryRawUnsafe<
    {
      totalPublished: bigint
      publishedLast30d: bigint
      publishedLast7d: bigint
      agentAuthored: bigint
    }[]
  >(`
    SELECT
      COUNT(*) FILTER (WHERE "status" = 'published' AND "deletedAt" IS NULL) AS "totalPublished",
      COUNT(*) FILTER (
        WHERE "status" = 'published' AND "deletedAt" IS NULL
          AND COALESCE("publishedAt", "createdAt") >= NOW() - INTERVAL '30 days'
      ) AS "publishedLast30d",
      COUNT(*) FILTER (
        WHERE "status" = 'published' AND "deletedAt" IS NULL
          AND COALESCE("publishedAt", "createdAt") >= NOW() - INTERVAL '7 days'
      ) AS "publishedLast7d",
      COUNT(*) FILTER (
        WHERE "status" = 'published' AND "deletedAt" IS NULL
          AND "authorAgentId" IS NOT NULL
      ) AS "agentAuthored"
    FROM "BlogPost"
  `)
  const r = rows[0]
  return {
    totalPublished: Number(r?.totalPublished ?? 0),
    publishedLast30d: Number(r?.publishedLast30d ?? 0),
    publishedLast7d: Number(r?.publishedLast7d ?? 0),
    agentAuthored: Number(r?.agentAuthored ?? 0),
  }
}

/**
 * Latest BlogInsights snapshot — the same row the writer agent reads.
 * We show it verbatim on the console so ops can see exactly what the
 * agent will act on tonight.
 */
export type LatestInsightsRow = {
  refreshedAt: Date
  windowDays: number
  totalSessions: number
  totalImpressions: number
  totalClicks: number
  payload: BlogInsightsSnapshot | null
}

export async function latestInsights(market = 'all'): Promise<LatestInsightsRow | null> {
  const rows = await prisma.$queryRawUnsafe<LatestInsightsRow[]>(
    `SELECT "refreshedAt", "windowDays", "totalSessions",
            "totalImpressions", "totalClicks", "payload"
       FROM "BlogInsights"
      WHERE "market" = $1
      ORDER BY "refreshedAt" DESC
      LIMIT 1`,
    market,
  )
  return rows[0] ?? null
}

/** Queued blog topics — the pipeline of "what's likely to publish next". */
export type QueuedTopicRow = {
  id: string
  topic: string
  targetAudience: string
  generatedAt: Date
}

export async function listQueuedTopics(limit = 10): Promise<QueuedTopicRow[]> {
  const rows = await prisma.$queryRawUnsafe<QueuedTopicRow[]>(
    `SELECT "id", "topic", "targetAudience", "generatedAt"
       FROM "BlogTopic"
      WHERE "status" = 'queued'
      ORDER BY "generatedAt" DESC
      LIMIT $1`,
    limit,
  )
  return rows
}

/** Cron schedule + last runs, straight from Supabase's pg_cron catalog. */
export type CronJobRow = {
  jobname: string
  schedule: string
  active: boolean
}

export type CronRunRow = {
  jobname: string
  status: string
  start_time: Date | null
  end_time: Date | null
  return_message: string | null
}

export async function listCronJobs(): Promise<CronJobRow[]> {
  const rows = await prisma.$queryRawUnsafe<CronJobRow[]>(
    `SELECT "jobname", "schedule", "active"
       FROM cron.job
      WHERE "jobname" IN ('blog-auto-generate-am', 'blog-auto-generate-pm', 'blog-insights-refresh', 'keep-web-warm')
      ORDER BY "jobname"`,
  )
  return rows
}

export async function listRecentCronRuns(limit = 10): Promise<CronRunRow[]> {
  try {
    const rows = await prisma.$queryRawUnsafe<CronRunRow[]>(
      `SELECT j.jobname, r.status, r.start_time, r.end_time, r.return_message
         FROM cron.job_run_details r
         JOIN cron.job j ON j.jobid = r.jobid
        WHERE j.jobname LIKE 'blog-%' OR j.jobname = 'keep-web-warm'
        ORDER BY r.start_time DESC NULLS LAST
        LIMIT $1`,
      limit,
    )
    return rows
  } catch {
    // Some managed Postgres flavours restrict access to job_run_details.
    // Fail quiet — the schedule table above is still shown.
    return []
  }
}
