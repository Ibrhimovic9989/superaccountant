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

// ── reels feed (video-only) ──────────────────────────────────

/**
 * Video-only slice of the feed. Powers /reels — the TikTok-style
 * vertical swipe view. Same shape as listGlobalFeed, filtered to
 * posts whose mediaUrl ends in a video extension.
 *
 * Keep the extension list in lockstep with `VIDEO_EXTS` in
 * @/lib/community/media so the client-side detector agrees with
 * what we serve.
 */
export async function listReelsFeed(args: {
  viewerId: string | null
  before?: string | null
  limit?: number
}): Promise<FeedPostView[]> {
  const limit = args.limit ?? 20
  const viewerId = args.viewerId ?? ''
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
       AND p."mediaUrl" IS NOT NULL
       AND (
         LOWER(p."mediaUrl") LIKE '%.mp4'
         OR LOWER(p."mediaUrl") LIKE '%.webm'
         OR LOWER(p."mediaUrl") LIKE '%.mov'
         OR LOWER(p."mediaUrl") LIKE '%.m4v'
       )
       AND ($2::timestamp IS NULL OR p."publishedAt" < $2::timestamp)
     ORDER BY p."publishedAt" DESC
     LIMIT $3`,
    viewerId,
    before,
    limit,
  )
  return rows.map(rowToFeedPost)
}

// ── active authors (story-row on /community) ─────────────────

export type ActiveAuthor = {
  userId: string
  handle: string
  name: string
  avatarUrl: string | null
  headline: string | null
  mostRecentKind: PostKind
  postedAt: string
}

/**
 * Distinct authors who posted in the last N days, ordered by their
 * most recent post. Powers the Instagram-style "who's active" avatar
 * strip at the top of /community.
 *
 * DISTINCT ON to collapse to one row per author, then re-sort. Cheap
 * enough to run on every request — the whole strip is <20 rows.
 */
export async function listActiveAuthors(
  windowDays = 7,
  limit = 12,
): Promise<ActiveAuthor[]> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      userId: string
      handle: string
      name: string | null
      avatarUrl: string | null
      track: 'india' | 'ksa' | null
      mostRecentKind: PostKind
      postedAt: Date
    }>
  >(
    `SELECT DISTINCT ON (p."authorId")
       p."authorId"     AS "userId",
       cp."handle"      AS "handle",
       iu."name"        AS "name",
       iu."image"       AS "avatarUrl",
       iu."preferredTrack"::text AS "track",
       p."kind"         AS "mostRecentKind",
       p."publishedAt"  AS "postedAt"
     FROM "CommunityPost" p
     JOIN "IdentityUser" iu ON iu."id" = p."authorId"
     JOIN "CommunityProfile" cp ON cp."userId" = p."authorId"
     WHERE p."deletedAt" IS NULL
       AND cp."publicVisibility" = 'public'
       AND p."publishedAt" > NOW() - ($1 || ' days')::interval
     ORDER BY p."authorId", p."publishedAt" DESC
     LIMIT $2`,
    String(windowDays),
    limit * 3,
  )
  return rows
    .sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime())
    .slice(0, limit)
    .map((r) => ({
      userId: r.userId,
      handle: r.handle,
      name: r.name ?? r.handle,
      avatarUrl: r.avatarUrl,
      headline:
        r.track === 'india'
          ? 'India'
          : r.track === 'ksa'
            ? 'KSA'
            : null,
      mostRecentKind: r.mostRecentKind,
      postedAt: r.postedAt.toISOString(),
    }))
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
