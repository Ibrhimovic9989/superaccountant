'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '@sa/db'
import { auth } from '@/lib/auth'
import { createComposedPost } from './post-store'
import { ensureProfile } from './profile-store'
import { validateHandleEdit } from './handle'
import { pushNotification } from './notification-store'
import type { PostKind } from './types'

/**
 * All community write operations. Server actions rather than a REST
 * layer so the mutations run inside the same request lifecycle as the
 * page render — no double round-trip, no separate auth pass.
 *
 * Auth policy: every action re-checks `auth()` and rejects with a
 * redirect to /sign-in. Never trust an argument that says "this is
 * user X" — pull the id from the session cookie.
 *
 * Revalidation: whichever path the mutation affects gets revalidated
 * so the next page load sees fresh data. Community feed pages are
 * ISR'd at 5-min TTL — the tag bust keeps them accurate for the
 * user who triggered the write.
 */

async function requireUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) redirect('/en/sign-in')
  return session.user.id
}

// ── like / unlike ────────────────────────────────────────────

/**
 * Toggle the viewer's like on a post. Returns the new count so the
 * client can display it optimistically confirmed.
 *
 * Concurrency: we use a small transaction to keep likeCount in sync
 * with the actual reactions row. The UNIQUE index on
 * (postId, userId, kind) means a double-like is a no-op at the DB.
 */
const ToggleLikeSchema = z.object({ postId: z.string().min(3) })

export async function toggleLikeAction(raw: {
  postId: string
}): Promise<{ liked: boolean; likeCount: number }> {
  const { postId } = ToggleLikeSchema.parse(raw)
  const userId = await requireUserId()

  const result = await prisma.$transaction(async (tx) => {
    // Look up the current state first — cheaper than blind INSERT + fallback.
    const existing = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "CommunityPostReaction"
        WHERE "postId" = $1 AND "userId" = $2 AND "kind" = 'like' LIMIT 1`,
      postId,
      userId,
    )
    if (existing.length > 0) {
      await tx.$executeRawUnsafe(
        `DELETE FROM "CommunityPostReaction"
          WHERE "postId" = $1 AND "userId" = $2 AND "kind" = 'like'`,
        postId,
        userId,
      )
      await tx.$executeRawUnsafe(
        `UPDATE "CommunityPost" SET "likeCount" = GREATEST(0, "likeCount" - 1)
          WHERE id = $1`,
        postId,
      )
    } else {
      const id = `r_${randomUUID().replace(/-/g, '').slice(0, 20)}`
      await tx.$executeRawUnsafe(
        `INSERT INTO "CommunityPostReaction" (id, "postId", "userId", "kind")
         VALUES ($1, $2, $3, 'like')
         ON CONFLICT ("postId", "userId", "kind") DO NOTHING`,
        id,
        postId,
        userId,
      )
      await tx.$executeRawUnsafe(
        `UPDATE "CommunityPost" SET "likeCount" = "likeCount" + 1 WHERE id = $1`,
        postId,
      )
    }
    const rows = await tx.$queryRawUnsafe<{ likeCount: number; liked: boolean }[]>(
      `SELECT
         p."likeCount",
         EXISTS (
           SELECT 1 FROM "CommunityPostReaction" r
            WHERE r."postId" = p.id AND r."userId" = $2 AND r."kind" = 'like'
         ) AS liked
       FROM "CommunityPost" p WHERE p.id = $1 LIMIT 1`,
      postId,
      userId,
    )
    return rows[0] ?? { likeCount: 0, liked: false }
  })

  // Push a notification to the post's author. Fire-and-forget — the
  // notification store swallows errors so a bell hiccup can't fail
  // a like. Only push on the transition to `liked=true` so unlike +
  // re-like doesn't spam.
  if (result.liked) {
    void notifyOnLike(postId, userId).catch(() => {})
  }
  revalidatePath(`/en/p/${postId}`)
  revalidatePath(`/ar/p/${postId}`)
  return { liked: result.liked, likeCount: result.likeCount }
}

async function notifyOnLike(postId: string, actorId: string): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<
    { authorId: string; snippet: string }[]
  >(
    `SELECT "authorId", LEFT("body", 60) AS "snippet"
       FROM "CommunityPost" WHERE id = $1 LIMIT 1`,
    postId,
  )
  const p = rows[0]
  if (!p) return
  await pushNotification({
    recipientId: p.authorId,
    actorId,
    type: 'like',
    subjectType: 'post',
    subjectId: postId,
    snippet: p.snippet,
  })
}

// ── save / unsave ────────────────────────────────────────────

const ToggleSaveSchema = z.object({ postId: z.string().min(3) })

export async function toggleSaveAction(raw: { postId: string }): Promise<{ saved: boolean }> {
  const { postId } = ToggleSaveSchema.parse(raw)
  const userId = await requireUserId()

  const saved = await prisma.$transaction(async (tx) => {
    const existing = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "CommunityPostReaction"
        WHERE "postId" = $1 AND "userId" = $2 AND "kind" = 'save' LIMIT 1`,
      postId,
      userId,
    )
    if (existing.length > 0) {
      await tx.$executeRawUnsafe(
        `DELETE FROM "CommunityPostReaction"
          WHERE "postId" = $1 AND "userId" = $2 AND "kind" = 'save'`,
        postId,
        userId,
      )
      return false
    }
    const id = `r_${randomUUID().replace(/-/g, '').slice(0, 20)}`
    await tx.$executeRawUnsafe(
      `INSERT INTO "CommunityPostReaction" (id, "postId", "userId", "kind")
       VALUES ($1, $2, $3, 'save')
       ON CONFLICT ("postId", "userId", "kind") DO NOTHING`,
      id,
      postId,
      userId,
    )
    return true
  })
  return { saved }
}

// ── follow / unfollow ────────────────────────────────────────

const ToggleFollowSchema = z.object({ followedId: z.string().min(3) })

export async function toggleFollowAction(raw: {
  followedId: string
}): Promise<{ following: boolean; followerCount: number }> {
  const { followedId } = ToggleFollowSchema.parse(raw)
  const userId = await requireUserId()
  if (userId === followedId) throw new Error("Can't follow yourself")

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "CommunityFollow"
        WHERE "followerId" = $1 AND "followedId" = $2 LIMIT 1`,
      userId,
      followedId,
    )
    if (existing.length > 0) {
      await tx.$executeRawUnsafe(
        `DELETE FROM "CommunityFollow"
          WHERE "followerId" = $1 AND "followedId" = $2`,
        userId,
        followedId,
      )
      await tx.$executeRawUnsafe(
        `UPDATE "CommunityProfile"
            SET "followerCount" = GREATEST(0, "followerCount" - 1)
          WHERE "userId" = $1`,
        followedId,
      )
      await tx.$executeRawUnsafe(
        `UPDATE "CommunityProfile"
            SET "followingCount" = GREATEST(0, "followingCount" - 1)
          WHERE "userId" = $1`,
        userId,
      )
    } else {
      const id = `f_${randomUUID().replace(/-/g, '').slice(0, 20)}`
      await tx.$executeRawUnsafe(
        `INSERT INTO "CommunityFollow" (id, "followerId", "followedId")
         VALUES ($1, $2, $3)
         ON CONFLICT ("followerId", "followedId") DO NOTHING`,
        id,
        userId,
        followedId,
      )
      await tx.$executeRawUnsafe(
        `UPDATE "CommunityProfile"
            SET "followerCount" = "followerCount" + 1
          WHERE "userId" = $1`,
        followedId,
      )
      await tx.$executeRawUnsafe(
        `UPDATE "CommunityProfile"
            SET "followingCount" = "followingCount" + 1
          WHERE "userId" = $1`,
        userId,
      )
      // Notify the followed user. Silently no-ops if the recipient
      // has already been notified about this specific follow (dedupe
      // handled by the partial UNIQUE on CommunityNotification).
      void pushNotification({
        recipientId: followedId,
        actorId: userId,
        type: 'follow',
        subjectType: 'profile',
        subjectId: followedId,
      }).catch(() => {})
    }
    const rows = await tx.$queryRawUnsafe<{ followerCount: number; following: boolean }[]>(
      `SELECT
         cp."followerCount",
         EXISTS(SELECT 1 FROM "CommunityFollow"
                 WHERE "followerId" = $1 AND "followedId" = $2) AS following
       FROM "CommunityProfile" cp WHERE cp."userId" = $2 LIMIT 1`,
      userId,
      followedId,
    )
    return rows[0] ?? { followerCount: 0, following: false }
  })

  return { following: result.following, followerCount: result.followerCount }
}

// ── comment ─────────────────────────────────────────────────

const CreateCommentSchema = z.object({
  postId: z.string().min(3),
  body: z.string().trim().min(1).max(1000),
})

export async function createCommentAction(
  raw: unknown,
): Promise<{ id: string; commentCount: number }> {
  const { postId, body } = CreateCommentSchema.parse(raw)
  const userId = await requireUserId()

  const id = `c_${randomUUID().replace(/-/g, '').slice(0, 20)}`
  const commentCount = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `INSERT INTO "CommunityPostComment" (id, "postId", "authorId", "body")
       VALUES ($1, $2, $3, $4)`,
      id,
      postId,
      userId,
      body,
    )
    await tx.$executeRawUnsafe(
      `UPDATE "CommunityPost" SET "commentCount" = "commentCount" + 1 WHERE id = $1`,
      postId,
    )
    const rows = await tx.$queryRawUnsafe<{ commentCount: number }[]>(
      `SELECT "commentCount" FROM "CommunityPost" WHERE id = $1`,
      postId,
    )
    return rows[0]?.commentCount ?? 0
  })

  // Notify the post's author (unless it's their own comment).
  void notifyOnComment(postId, userId, body).catch(() => {})
  revalidatePath(`/en/p/${postId}`)
  revalidatePath(`/ar/p/${postId}`)
  return { id, commentCount }
}

async function notifyOnComment(
  postId: string,
  actorId: string,
  body: string,
): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<{ authorId: string }[]>(
    `SELECT "authorId" FROM "CommunityPost" WHERE id = $1 LIMIT 1`,
    postId,
  )
  const p = rows[0]
  if (!p) return
  await pushNotification({
    recipientId: p.authorId,
    actorId,
    type: 'comment',
    subjectType: 'post',
    subjectId: postId,
    snippet: body.slice(0, 80),
  })
}

// ── compose post ────────────────────────────────────────────

const CreatePostSchema = z.object({
  kind: z.enum(['win', 'tip', 'showcase', 'ask', 'milestone']),
  body: z.string().trim().min(4).max(2000),
  tags: z.array(z.string().min(1).max(40)).max(6).optional(),
  mediaUrl: z.string().url().optional().nullable(),
})

export async function createPostAction(raw: unknown): Promise<{ id: string; handle: string }> {
  const parsed = CreatePostSchema.parse(raw)
  const session = await auth()
  if (!session?.user?.id || !session?.user?.email) redirect('/en/sign-in')

  // Ensure the viewer has a profile before we let them post.
  const profile = await ensureProfile({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
  })

  const { id } = await createComposedPost({
    authorId: session.user.id,
    kind: parsed.kind as PostKind,
    body: parsed.body,
    tags: parsed.tags ?? [],
    mediaUrl: parsed.mediaUrl ?? undefined,
  })

  // Feed + profile pages are the two surfaces that need a bust — leave
  // the specific /p/[id] alone since it renders fresh on first hit.
  revalidatePath('/en/community')
  revalidatePath('/ar/community')
  revalidatePath(`/en/u/${profile.handle}`)
  revalidatePath(`/ar/u/${profile.handle}`)
  return { id, handle: profile.handle }
}

// ── update profile bio / tone / visibility ─────────────────

const UpdateProfileMetaSchema = z.object({
  bio: z.string().max(200).optional().nullable(),
  tone: z.enum(['accent', 'brand', 'grape', 'coral', 'mint', 'blush', 'ink']).optional(),
  visibility: z.enum(['public', 'members', 'hidden']).optional(),
})

export async function updateProfileMetaAction(raw: unknown): Promise<{ ok: true }> {
  const parsed = UpdateProfileMetaSchema.parse(raw)
  const userId = await requireUserId()

  // Coalesce to existing values so a partial update doesn't null out
  // unrelated columns.
  await prisma.$executeRawUnsafe(
    `UPDATE "CommunityProfile"
        SET "bio" = COALESCE($2, "bio"),
            "tone" = COALESCE($3, "tone"),
            "publicVisibility" = COALESCE($4, "publicVisibility"),
            "updatedAt" = NOW()
      WHERE "userId" = $1`,
    userId,
    parsed.bio ?? null,
    parsed.tone ?? null,
    parsed.visibility ?? null,
  )

  // Bust the profile page cache. We don't know the handle up-front,
  // so read + revalidate both locales for the current one.
  const rows = await prisma.$queryRawUnsafe<{ handle: string }[]>(
    `SELECT handle FROM "CommunityProfile" WHERE "userId" = $1 LIMIT 1`,
    userId,
  )
  const handle = rows[0]?.handle
  if (handle) {
    revalidatePath(`/en/u/${handle}`)
    revalidatePath(`/ar/u/${handle}`)
  }
  return { ok: true }
}

// ── update handle (one edit) ────────────────────────────────

const UpdateHandleSchema = z.object({ handle: z.string().min(3).max(24) })

export async function updateHandleAction(
  raw: unknown,
): Promise<{ ok: true; handle: string } | { ok: false; error: string }> {
  const parsed = UpdateHandleSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'Invalid handle' }
  const userId = await requireUserId()

  // Load current profile — enforce one-edit rule.
  const rows = await prisma.$queryRawUnsafe<
    { id: string; handle: string; handleEditsRemaining: number }[]
  >(
    `SELECT id, handle, "handleEditsRemaining" FROM "CommunityProfile"
      WHERE "userId" = $1 LIMIT 1`,
    userId,
  )
  const current = rows[0]
  if (!current) return { ok: false, error: 'Profile not found' }
  if (current.handleEditsRemaining <= 0) {
    return { ok: false, error: "You've already changed your handle once — this one is permanent." }
  }

  const validation = await validateHandleEdit(parsed.data.handle, userId)
  if (!validation.ok) return validation

  await prisma.$executeRawUnsafe(
    `UPDATE "CommunityProfile"
        SET "handle" = $1,
            "handleEditsRemaining" = "handleEditsRemaining" - 1,
            "updatedAt" = NOW()
      WHERE "userId" = $2`,
    validation.handle,
    userId,
  )
  revalidatePath(`/en/u/${current.handle}`)
  revalidatePath(`/en/u/${validation.handle}`)
  return { ok: true, handle: validation.handle }
}
