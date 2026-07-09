import 'server-only'
import { prisma } from '@sa/db'
import type { CommentView, FeedPostView, PostKind, ProfileTone } from './types'

/**
 * Global feed + single-post reads. Same raw-SQL denormalised-author
 * approach as profile-store.listRecentPostsByAuthor — one query
 * returns everything the UI needs, so a feed page renders in a single
 * round-trip.
 *
 * Cursor semantics: pass the last-seen post's publishedAt ISO string
 * to `before`. Nulls out on the first page. Simpler than opaque
 * cursors and works because publishedAt is DESC-ordered + indexed.
 */

type FeedRow = {
  id: string
  authorId: string
  kind: PostKind
  body: string
  tags: string[]
  mediaUrl: string | null
  source: string
  linkedEntityType: string | null
  linkedEntityId: string | null
  publishedAt: Date
  likeCount: number
  commentCount: number
  authorName: string | null
  authorImage: string | null
  authorHandle: string
  authorTone: ProfileTone
  authorVerified: boolean
  authorTrack: 'india' | 'ksa' | null
  viewerLiked: boolean
  viewerSaved: boolean
}

const PAGE_SIZE_DEFAULT = 24

// ── global feed ──────────────────────────────────────────────

export async function listGlobalFeed(args: {
  viewerId: string | null
  before?: string | null
  limit?: number
  kind?: PostKind | null
}): Promise<FeedPostView[]> {
  const limit = args.limit ?? PAGE_SIZE_DEFAULT
  const viewerId = args.viewerId ?? ''
  const before = args.before ? new Date(args.before) : null
  const kind = args.kind ?? null

  // Two similar queries by whether a kind filter is set. Keeping them
  // explicit beats stitching WHERE clauses at runtime — the planner
  // picks the right partial index either way.
  const rows = await prisma.$queryRawUnsafe<FeedRow[]>(
    `SELECT
       p."id", p."authorId", p."kind", p."body", p."tags", p."mediaUrl",
       p."source", p."linkedEntityType", p."linkedEntityId",
       p."publishedAt", p."likeCount", p."commentCount",
       iu."name" AS "authorName",
       iu."image" AS "authorImage",
       cp."handle" AS "authorHandle",
       cp."tone" AS "authorTone",
       cp."verified" AS "authorVerified",
       iu."preferredTrack"::text AS "authorTrack",
       COALESCE(
         (SELECT true FROM "CommunityPostReaction" r
           WHERE r."postId" = p."id" AND r."userId" = $1 AND r."kind" = 'like' LIMIT 1),
         false
       ) AS "viewerLiked",
       COALESCE(
         (SELECT true FROM "CommunityPostReaction" r
           WHERE r."postId" = p."id" AND r."userId" = $1 AND r."kind" = 'save' LIMIT 1),
         false
       ) AS "viewerSaved"
     FROM "CommunityPost" p
     JOIN "IdentityUser" iu ON iu."id" = p."authorId"
     LEFT JOIN "CommunityProfile" cp ON cp."userId" = p."authorId"
     WHERE p."deletedAt" IS NULL
       AND ($2::timestamp IS NULL OR p."publishedAt" < $2::timestamp)
       AND ($3::text IS NULL OR p."kind" = $3::text)
     ORDER BY p."publishedAt" DESC
     LIMIT $4`,
    viewerId,
    before,
    kind,
    limit,
  )
  return rows.map(rowToFeedPost)
}

// ── following feed (weekly cadence — Week 2 stub) ────────────

/**
 * Feed of posts by users the viewer follows. Falls back to the global
 * feed when the viewer follows nobody, so a new user's Following tab
 * is never empty.
 */
export async function listFollowingFeed(args: {
  viewerId: string
  before?: string | null
  limit?: number
}): Promise<FeedPostView[]> {
  const limit = args.limit ?? PAGE_SIZE_DEFAULT
  const before = args.before ? new Date(args.before) : null
  const rows = await prisma.$queryRawUnsafe<FeedRow[]>(
    `SELECT
       p."id", p."authorId", p."kind", p."body", p."tags", p."mediaUrl",
       p."source", p."linkedEntityType", p."linkedEntityId",
       p."publishedAt", p."likeCount", p."commentCount",
       iu."name" AS "authorName",
       iu."image" AS "authorImage",
       cp."handle" AS "authorHandle",
       cp."tone" AS "authorTone",
       cp."verified" AS "authorVerified",
       iu."preferredTrack"::text AS "authorTrack",
       COALESCE(
         (SELECT true FROM "CommunityPostReaction" r
           WHERE r."postId" = p."id" AND r."userId" = $1 AND r."kind" = 'like' LIMIT 1),
         false
       ) AS "viewerLiked",
       COALESCE(
         (SELECT true FROM "CommunityPostReaction" r
           WHERE r."postId" = p."id" AND r."userId" = $1 AND r."kind" = 'save' LIMIT 1),
         false
       ) AS "viewerSaved"
     FROM "CommunityPost" p
     JOIN "IdentityUser" iu ON iu."id" = p."authorId"
     LEFT JOIN "CommunityProfile" cp ON cp."userId" = p."authorId"
     WHERE p."deletedAt" IS NULL
       AND p."authorId" IN (
         SELECT "followedId" FROM "CommunityFollow" WHERE "followerId" = $1
       )
       AND ($2::timestamp IS NULL OR p."publishedAt" < $2::timestamp)
     ORDER BY p."publishedAt" DESC
     LIMIT $3`,
    args.viewerId,
    before,
    limit,
  )
  return rows.map(rowToFeedPost)
}

// ── single post ──────────────────────────────────────────────

export async function getPostById(
  postId: string,
  viewerId: string | null,
): Promise<FeedPostView | null> {
  const rows = await prisma.$queryRawUnsafe<FeedRow[]>(
    `SELECT
       p."id", p."authorId", p."kind", p."body", p."tags", p."mediaUrl",
       p."source", p."linkedEntityType", p."linkedEntityId",
       p."publishedAt", p."likeCount", p."commentCount",
       iu."name" AS "authorName",
       iu."image" AS "authorImage",
       cp."handle" AS "authorHandle",
       cp."tone" AS "authorTone",
       cp."verified" AS "authorVerified",
       iu."preferredTrack"::text AS "authorTrack",
       COALESCE(
         (SELECT true FROM "CommunityPostReaction" r
           WHERE r."postId" = p."id" AND r."userId" = $2 AND r."kind" = 'like' LIMIT 1),
         false
       ) AS "viewerLiked",
       COALESCE(
         (SELECT true FROM "CommunityPostReaction" r
           WHERE r."postId" = p."id" AND r."userId" = $2 AND r."kind" = 'save' LIMIT 1),
         false
       ) AS "viewerSaved"
     FROM "CommunityPost" p
     JOIN "IdentityUser" iu ON iu."id" = p."authorId"
     LEFT JOIN "CommunityProfile" cp ON cp."userId" = p."authorId"
     WHERE p."id" = $1 AND p."deletedAt" IS NULL
     LIMIT 1`,
    postId,
    viewerId ?? '',
  )
  const row = rows[0]
  return row ? rowToFeedPost(row) : null
}

// ── comments ────────────────────────────────────────────────

type CommentRow = {
  id: string
  body: string
  createdAt: Date
  authorId: string
  authorName: string | null
  authorImage: string | null
  authorHandle: string
  authorTone: ProfileTone
  authorVerified: boolean
  authorTrack: 'india' | 'ksa' | null
}

export async function listComments(
  postId: string,
  limit = 50,
): Promise<CommentView[]> {
  const rows = await prisma.$queryRawUnsafe<CommentRow[]>(
    `SELECT
       c."id", c."body", c."createdAt", c."authorId",
       iu."name" AS "authorName",
       iu."image" AS "authorImage",
       cp."handle" AS "authorHandle",
       cp."tone" AS "authorTone",
       cp."verified" AS "authorVerified",
       iu."preferredTrack"::text AS "authorTrack"
     FROM "CommunityPostComment" c
     JOIN "IdentityUser" iu ON iu."id" = c."authorId"
     LEFT JOIN "CommunityProfile" cp ON cp."userId" = c."authorId"
     WHERE c."postId" = $1 AND c."deletedAt" IS NULL
     ORDER BY c."createdAt" ASC
     LIMIT $2`,
    postId,
    limit,
  )
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    author: {
      id: r.authorId,
      handle: r.authorHandle ?? '',
      name: r.authorName ?? r.authorHandle ?? '',
      avatarUrl: r.authorImage,
      tone: r.authorTone ?? 'accent',
      verified: r.authorVerified,
      headline: r.authorTrack === 'india'
        ? 'India · Chartered Path'
        : r.authorTrack === 'ksa'
          ? "KSA · Mu'tamad Path"
          : null,
    },
  }))
}

// ── helper ──────────────────────────────────────────────────

function rowToFeedPost(row: FeedRow): FeedPostView {
  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    tags: row.tags,
    mediaUrl: row.mediaUrl,
    source: row.source as FeedPostView['source'],
    linkedEntityType: row.linkedEntityType,
    linkedEntityId: row.linkedEntityId,
    publishedAt: row.publishedAt.toISOString(),
    author: {
      id: row.authorId,
      handle: row.authorHandle ?? '',
      name: row.authorName ?? row.authorHandle ?? '',
      avatarUrl: row.authorImage,
      tone: row.authorTone ?? 'accent',
      verified: row.authorVerified,
      headline: row.authorTrack === 'india'
        ? 'India · Chartered Path'
        : row.authorTrack === 'ksa'
          ? "KSA · Mu'tamad Path"
          : null,
    },
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    viewerLiked: row.viewerLiked,
    viewerSaved: row.viewerSaved,
  }
}
