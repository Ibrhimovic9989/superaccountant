import 'server-only'
import { randomUUID } from 'node:crypto'
import { prisma } from '@sa/db'
import { generateHandle } from './handle'
import type {
  FeedPostView,
  PostAuthorView,
  PostKind,
  PostSource,
  ProfileAchievement,
  ProfileTone,
  ProfileView,
} from './types'

/**
 * All reads/writes for CommunityProfile go through here. Same raw-SQL
 * pattern that apps/blog uses — the community tables live outside
 * schema.prisma.
 *
 * The high-value function here is `getProfileByHandle` which stitches
 * together the profile row, the author view, the LMS-verified
 * achievements, and the last N posts. It runs in a single Promise.all
 * fan-out so a profile page renders in one round-trip.
 */

// ── ensureProfile ────────────────────────────────────────────

/**
 * Called on every authed page load (via a light hook) — if the current
 * user has no CommunityProfile, generate one with an auto-handle.
 * Idempotent. Returns the profile id.
 */
export async function ensureProfile(user: {
  id: string
  name: string | null
  email: string
}): Promise<{ id: string; handle: string; created: boolean }> {
  const existing = await prisma.$queryRawUnsafe<{ id: string; handle: string }[]>(
    `SELECT "id", "handle" FROM "CommunityProfile" WHERE "userId" = $1 LIMIT 1`,
    user.id,
  )
  const found = existing[0]
  if (found) return { ...found, created: false }

  const handle = await generateHandle(user.name ?? user.email)
  const id = `cp_${randomUUID().replace(/-/g, '').slice(0, 20)}`
  await prisma.$executeRawUnsafe(
    `INSERT INTO "CommunityProfile" ("id", "userId", "handle") VALUES ($1, $2, $3)
     ON CONFLICT ("userId") DO NOTHING`,
    id,
    user.id,
    handle,
  )
  return { id, handle, created: true }
}

// ── getProfileByHandle ───────────────────────────────────────

type ProfileRow = {
  profileId: string
  userId: string
  handle: string
  bio: string | null
  coverImageUrl: string | null
  tone: ProfileTone
  verified: boolean
  publicVisibility: 'public' | 'members' | 'hidden'
  followerCount: number
  followingCount: number
  postCount: number
  userName: string | null
  userEmail: string
  userImage: string | null
  preferredTrack: 'india' | 'ksa' | null
}

/**
 * Look up a profile by URL handle. Case-insensitive. Returns `null` if
 * the handle doesn't exist, `{ blocked: true, reason }` if it exists
 * but the viewer isn't allowed to see it, and the full ProfileView
 * otherwise.
 */
export async function getProfileByHandle(
  handle: string,
  viewerId: string | null,
): Promise<{ view: ProfileView } | { blocked: 'not-found' | 'private' } | null> {
  const rows = await prisma.$queryRawUnsafe<ProfileRow[]>(
    `SELECT
       cp."id" AS "profileId",
       cp."userId",
       cp."handle",
       cp."bio",
       cp."coverImageUrl",
       cp."tone",
       cp."verified",
       cp."publicVisibility",
       cp."followerCount",
       cp."followingCount",
       cp."postCount",
       iu."name" AS "userName",
       iu."email" AS "userEmail",
       iu."image" AS "userImage",
       iu."preferredTrack"::text AS "preferredTrack"
     FROM "CommunityProfile" cp
     JOIN "IdentityUser" iu ON iu."id" = cp."userId"
     WHERE lower(cp."handle") = lower($1)
     LIMIT 1`,
    handle,
  )
  const row = rows[0]
  if (!row) return { blocked: 'not-found' }

  const isOwner = viewerId === row.userId
  if (row.publicVisibility === 'hidden' && !isOwner) {
    return { blocked: 'private' }
  }
  if (row.publicVisibility === 'members' && !viewerId) {
    return { blocked: 'private' }
  }

  // Parallel fan-out for the rest of the profile — posts + achievements
  // + viewer-following flag.
  const [posts, achievements, viewerFollowing] = await Promise.all([
    listRecentPostsByAuthor(row.userId, 24, viewerId),
    listAchievementsForUser(row.userId, row.preferredTrack ?? 'india'),
    viewerId && !isOwner ? isViewerFollowing(viewerId, row.userId) : Promise.resolve(false),
  ])

  const author: PostAuthorView = {
    id: row.userId,
    handle: row.handle,
    name: row.userName ?? row.handle,
    avatarUrl: row.userImage,
    tone: row.tone,
    verified: row.verified,
    headline: buildHeadline(row.preferredTrack, achievements),
  }

  return {
    view: {
      author,
      bio: row.bio,
      coverImageUrl: row.coverImageUrl,
      posts,
      followerCount: row.followerCount,
      followingCount: row.followingCount,
      postCount: row.postCount,
      viewerFollowing,
      viewerIsOwner: isOwner,
      achievements,
    },
  }
}

// ── list posts ───────────────────────────────────────────────

type PostRow = {
  id: string
  authorId: string
  kind: PostKind
  body: string
  tags: string[]
  mediaUrl: string | null
  source: PostSource
  linkedEntityType: string | null
  linkedEntityId: string | null
  publishedAt: Date
  likeCount: number
  commentCount: number
  // Author denorm — pulled in the same query so profile grids don't
  // fan out to N author queries.
  authorName: string | null
  authorImage: string | null
  authorHandle: string
  authorTone: ProfileTone
  authorVerified: boolean
  authorTrack: 'india' | 'ksa' | null
  viewerLiked: boolean
  viewerSaved: boolean
}

export async function listRecentPostsByAuthor(
  authorId: string,
  limit: number,
  viewerId: string | null,
): Promise<FeedPostView[]> {
  const rows = await prisma.$queryRawUnsafe<PostRow[]>(
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
           WHERE r."postId" = p."id" AND r."userId" = $3 AND r."kind" = 'like' LIMIT 1),
         false
       ) AS "viewerLiked",
       COALESCE(
         (SELECT true FROM "CommunityPostReaction" r
           WHERE r."postId" = p."id" AND r."userId" = $3 AND r."kind" = 'save' LIMIT 1),
         false
       ) AS "viewerSaved"
     FROM "CommunityPost" p
     JOIN "IdentityUser" iu ON iu."id" = p."authorId"
     LEFT JOIN "CommunityProfile" cp ON cp."userId" = p."authorId"
     WHERE p."authorId" = $1 AND p."deletedAt" IS NULL
     ORDER BY p."publishedAt" DESC
     LIMIT $2`,
    authorId,
    limit,
    viewerId ?? '',
  )
  return rows.map(rowToFeedPost)
}

function rowToFeedPost(row: PostRow): FeedPostView {
  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    tags: row.tags,
    mediaUrl: row.mediaUrl,
    source: row.source,
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

// ── follow lookup ────────────────────────────────────────────

async function isViewerFollowing(viewerId: string, followedId: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "CommunityFollow"
      WHERE "followerId" = $1 AND "followedId" = $2 LIMIT 1`,
    viewerId,
    followedId,
  )
  return rows.length > 0
}

// ── achievements from LMS data ───────────────────────────────

/**
 * Verified achievements pulled from the LMS. These are the recruiter-
 * facing signal that makes SA profiles worth more than a LinkedIn
 * page. Everything below is cross-checkable against DB rows the
 * agent + assessment pipeline write.
 */
export async function listAchievementsForUser(
  userId: string,
  _market: 'india' | 'ksa',
): Promise<ProfileAchievement[]> {
  const [certRows, gtRows, cohortRows] = await Promise.all([
    prisma.$queryRawUnsafe<{ id: string; hash: string; issuedAt: Date; trackId: string; score: number }[]>(
      `SELECT id, hash, "issuedAt", "trackId", score
         FROM "CertificationCertificate"
        WHERE "userId" = $1
        ORDER BY "issuedAt" DESC`,
      userId,
    ),
    prisma.$queryRawUnsafe<{ id: string; score: number | null; gradedAt: Date | null }[]>(
      `SELECT id, score, "gradedAt"
         FROM "AssessmentAttempt"
        WHERE "userId" = $1 AND "kind" = 'grand' AND "status" = 'graded'
          AND COALESCE(score, 0) >= 0.6
        ORDER BY "gradedAt" DESC NULLS LAST`,
      userId,
    ),
    prisma.$queryRawUnsafe<{ id: string; completedAt: Date | null; trackId: string }[]>(
      `SELECT id, "completedAt", "trackId"
         FROM "LearningEnrollment"
        WHERE "userId" = $1 AND "completedAt" IS NOT NULL
        ORDER BY "completedAt" DESC`,
      userId,
    ),
  ])

  const achievements: ProfileAchievement[] = []

  for (const c of certRows) {
    achievements.push({
      id: `cert:${c.id}`,
      kind: 'certificate',
      title: 'SuperAccountant Certificate',
      subtitle: `${c.trackId.toUpperCase()} · ${Math.round(c.score * 100)}% grand-test score`,
      earnedAt: c.issuedAt.toISOString(),
      verifyUrl: `/verify/${c.hash}`,
    })
  }
  for (const gt of gtRows) {
    achievements.push({
      id: `gt:${gt.id}`,
      kind: 'grand-test',
      title: 'Grand test — passed',
      subtitle: gt.score != null ? `${Math.round(gt.score * 100)}% mastery` : 'graded',
      earnedAt: (gt.gradedAt ?? new Date()).toISOString(),
      verifyUrl: null,
    })
  }
  for (const co of cohortRows) {
    achievements.push({
      id: `cohort:${co.id}`,
      kind: 'cohort-complete',
      title: 'Cohort completed',
      subtitle: co.trackId.toUpperCase(),
      earnedAt: (co.completedAt ?? new Date()).toISOString(),
      verifyUrl: null,
    })
  }
  return achievements
}

function buildHeadline(
  track: 'india' | 'ksa' | null,
  achievements: ProfileAchievement[],
): string | null {
  const trackLabel = track === 'india'
    ? 'India · Chartered Path'
    : track === 'ksa'
      ? "KSA · Mu'tamad Path"
      : null
  if (!trackLabel) return null
  const certified = achievements.find((a) => a.kind === 'certificate')
  if (certified) return `${trackLabel} · Certified`
  const gt = achievements.find((a) => a.kind === 'grand-test')
  if (gt) return `${trackLabel} · Grand-test passed`
  return trackLabel
}
