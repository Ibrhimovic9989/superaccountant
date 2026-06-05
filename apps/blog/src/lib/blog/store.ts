/**
 * Raw-SQL store for the blog. Tables are created by
 * packages/db/scripts/add-blog-tables.mjs and not declared in
 * schema.prisma, so all reads/writes go through prisma.$queryRaw /
 * $executeRaw.
 *
 * Filter semantics mirror filter.ts (pure predicates) — keep the SQL
 * WHERE clause and isPubliclyVisible in lock-step.
 */

import { prisma } from '@sa/db'
import type {
  BlogMarket,
  BlogPost,
  BlogPostStatus,
  BlogTopic,
  BlogTopicAudience,
  Locale,
} from './types'

const PUBLISHED_WHERE = `"status" = 'published' AND "deletedAt" IS NULL AND "publishedAt" IS NOT NULL AND "publishedAt" <= NOW()`

// cuid-ish id generator. We don't pull in @paralleldrive/cuid2 — same
// shape as `cuid()` Prisma uses but cheap to inline. Collision-resistant
// enough for editorial volumes.
function newId(): string {
  return (
    'c' +
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  )
}

// ── Public reads ────────────────────────────────────────────

export async function getPublishedPostBySlug(slug: string, _locale: Locale): Promise<BlogPost | null> {
  // Locale is honoured at render time (the page picks titleEn vs titleAr,
  // contentEnMdx vs contentArMdx). The DB row is bilingual.
  const rows = await prisma.$queryRawUnsafe<BlogPost[]>(
    `SELECT * FROM "BlogPost" WHERE "slug" = $1 AND ${PUBLISHED_WHERE} LIMIT 1`,
    slug,
  )
  return rows[0] ?? null
}

export async function listRecentPublished(opts: {
  market?: BlogMarket
  limit: number
  offset?: number
}): Promise<BlogPost[]> {
  const offset = opts.offset ?? 0
  if (opts.market) {
    return prisma.$queryRawUnsafe<BlogPost[]>(
      `SELECT * FROM "BlogPost" WHERE ${PUBLISHED_WHERE} AND "market" = $1
       ORDER BY "publishedAt" DESC LIMIT $2 OFFSET $3`,
      opts.market,
      opts.limit,
      offset,
    )
  }
  return prisma.$queryRawUnsafe<BlogPost[]>(
    `SELECT * FROM "BlogPost" WHERE ${PUBLISHED_WHERE}
     ORDER BY "publishedAt" DESC LIMIT $1 OFFSET $2`,
    opts.limit,
    offset,
  )
}

export async function listByKeyword(keyword: string, limit = 50): Promise<BlogPost[]> {
  return prisma.$queryRawUnsafe<BlogPost[]>(
    `SELECT * FROM "BlogPost" WHERE ${PUBLISHED_WHERE} AND $1 = ANY("targetKeywords")
     ORDER BY "publishedAt" DESC LIMIT $2`,
    keyword,
    limit,
  )
}

export async function listRelatedByKeywords(
  postId: string,
  keywords: string[],
  limit = 3,
): Promise<BlogPost[]> {
  if (keywords.length === 0) return []
  return prisma.$queryRawUnsafe<BlogPost[]>(
    `SELECT * FROM "BlogPost"
     WHERE ${PUBLISHED_WHERE}
       AND "id" <> $1
       AND "targetKeywords" && $2::text[]
     ORDER BY "publishedAt" DESC LIMIT $3`,
    postId,
    keywords,
    limit,
  )
}

export async function countPublished(): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "BlogPost" WHERE ${PUBLISHED_WHERE}`,
  )
  return Number(rows[0]?.count ?? 0n)
}

export async function listAllPublishedSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return prisma.$queryRawUnsafe<{ slug: string; updatedAt: Date }[]>(
    `SELECT "slug", "updatedAt" FROM "BlogPost" WHERE ${PUBLISHED_WHERE}
     ORDER BY "publishedAt" DESC`,
  )
}

// ── Admin reads ─────────────────────────────────────────────

export async function listAllPostsForAdmin(opts: {
  statusFilter?: BlogPostStatus | 'all'
  marketFilter?: BlogMarket | 'all'
  limit?: number
} = {}): Promise<BlogPost[]> {
  const status = opts.statusFilter ?? 'all'
  const market = opts.marketFilter ?? 'all'
  const limit = opts.limit ?? 200
  const where: string[] = [`"deletedAt" IS NULL`]
  const params: unknown[] = []
  if (status !== 'all') {
    params.push(status)
    where.push(`"status" = $${params.length}`)
  }
  if (market !== 'all') {
    params.push(market)
    where.push(`"market" = $${params.length}`)
  }
  params.push(limit)
  return prisma.$queryRawUnsafe<BlogPost[]>(
    `SELECT * FROM "BlogPost" WHERE ${where.join(' AND ')}
     ORDER BY COALESCE("publishedAt", "createdAt") DESC LIMIT $${params.length}`,
    ...params,
  )
}

export async function getPostByIdForAdmin(id: string): Promise<BlogPost | null> {
  const rows = await prisma.$queryRawUnsafe<BlogPost[]>(
    `SELECT * FROM "BlogPost" WHERE "id" = $1 AND "deletedAt" IS NULL LIMIT 1`,
    id,
  )
  return rows[0] ?? null
}

export async function countByStatusForAdmin(): Promise<Record<BlogPostStatus, number>> {
  const rows = await prisma.$queryRawUnsafe<{ status: BlogPostStatus; count: bigint }[]>(
    `SELECT "status", COUNT(*)::bigint AS count FROM "BlogPost"
     WHERE "deletedAt" IS NULL GROUP BY "status"`,
  )
  const out: Record<BlogPostStatus, number> = {
    draft: 0,
    scheduled: 0,
    published: 0,
    archived: 0,
  }
  for (const r of rows) out[r.status] = Number(r.count)
  return out
}

// ── Admin writes ────────────────────────────────────────────

export type CreatePostInput = {
  slug: string
  titleEn: string
  subtitleEn?: string | null
  metaDescriptionEn: string
  contentEnMdx: string
  heroImageUrl?: string | null
  market: BlogMarket
  targetKeywords: string[]
  status?: BlogPostStatus
  authorHumanUserId?: string | null
}

export async function createPost(input: CreatePostInput): Promise<BlogPost> {
  const id = newId()
  const status = input.status ?? 'draft'
  const publishedAt = status === 'published' ? new Date() : null
  await prisma.$executeRawUnsafe(
    `INSERT INTO "BlogPost" (
       "id","slug","titleEn","subtitleEn","metaDescriptionEn","contentEnMdx",
       "heroImageUrl","market","targetKeywords","status","publishedAt",
       "authorHumanUserId","createdAt","updatedAt"
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::text[],$10,$11,$12,NOW(),NOW())`,
    id,
    input.slug,
    input.titleEn,
    input.subtitleEn ?? null,
    input.metaDescriptionEn,
    input.contentEnMdx,
    input.heroImageUrl ?? null,
    input.market,
    input.targetKeywords,
    status,
    publishedAt,
    input.authorHumanUserId ?? null,
  )
  const created = await getPostByIdForAdmin(id)
  if (!created) throw new Error('createPost: row vanished after insert')
  return created
}

export type UpdatePostPatch = Partial<{
  slug: string
  titleEn: string
  subtitleEn: string | null
  metaDescriptionEn: string
  contentEnMdx: string
  heroImageUrl: string | null
  market: BlogMarket
  targetKeywords: string[]
  status: BlogPostStatus
  publishedAt: Date | null
  scheduledFor: Date | null
}>

const UPDATE_COLUMN_TO_TYPE: Record<keyof UpdatePostPatch, string> = {
  slug: 'text',
  titleEn: 'text',
  subtitleEn: 'text',
  metaDescriptionEn: 'text',
  contentEnMdx: 'text',
  heroImageUrl: 'text',
  market: 'text',
  targetKeywords: 'text[]',
  status: 'text',
  publishedAt: 'timestamp',
  scheduledFor: 'timestamp',
}

export async function updatePost(id: string, patch: UpdatePostPatch): Promise<BlogPost | null> {
  const sets: string[] = []
  const params: unknown[] = []
  for (const key of Object.keys(patch) as (keyof UpdatePostPatch)[]) {
    const value = patch[key]
    if (value === undefined) continue
    params.push(value)
    const cast = UPDATE_COLUMN_TO_TYPE[key]
    sets.push(`"${key}" = $${params.length}::${cast}`)
  }
  if (sets.length === 0) return getPostByIdForAdmin(id)
  params.push(id)
  await prisma.$executeRawUnsafe(
    `UPDATE "BlogPost" SET ${sets.join(', ')}, "updatedAt" = NOW()
     WHERE "id" = $${params.length} AND "deletedAt" IS NULL`,
    ...params,
  )
  return getPostByIdForAdmin(id)
}

export async function publishPost(id: string): Promise<BlogPost | null> {
  await prisma.$executeRawUnsafe(
    `UPDATE "BlogPost" SET "status" = 'published', "publishedAt" = COALESCE("publishedAt", NOW()),
       "updatedAt" = NOW() WHERE "id" = $1 AND "deletedAt" IS NULL`,
    id,
  )
  return getPostByIdForAdmin(id)
}

export async function archivePost(id: string): Promise<BlogPost | null> {
  await prisma.$executeRawUnsafe(
    `UPDATE "BlogPost" SET "status" = 'archived', "updatedAt" = NOW()
     WHERE "id" = $1 AND "deletedAt" IS NULL`,
    id,
  )
  return getPostByIdForAdmin(id)
}

export async function softDeletePost(id: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "BlogPost" SET "deletedAt" = NOW(), "updatedAt" = NOW() WHERE "id" = $1`,
    id,
  )
}

export async function incrementViewCount(id: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "BlogPost" SET "viewCount" = "viewCount" + 1 WHERE "id" = $1`,
    id,
  )
}

// ── Topics ──────────────────────────────────────────────────

export async function listRecentTopicsForAdmin(limit = 50): Promise<BlogTopic[]> {
  return prisma.$queryRawUnsafe<BlogTopic[]>(
    `SELECT * FROM "BlogTopic" WHERE "status" IN ('researched', 'queued')
     ORDER BY "generatedAt" DESC LIMIT $1`,
    limit,
  )
}

export async function getTopicById(id: string): Promise<BlogTopic | null> {
  const rows = await prisma.$queryRawUnsafe<BlogTopic[]>(
    `SELECT * FROM "BlogTopic" WHERE "id" = $1 LIMIT 1`,
    id,
  )
  return rows[0] ?? null
}

export type { BlogPost, BlogTopic, BlogMarket, BlogPostStatus, BlogTopicAudience, Locale }
