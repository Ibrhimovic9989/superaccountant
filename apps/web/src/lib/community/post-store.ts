import 'server-only'
import { randomUUID } from 'node:crypto'
import { prisma } from '@sa/db'
import { ensureProfile } from './profile-store'
import { pushNotification } from './notification-store'
import type { PostKind, PostSource } from './types'

/**
 * Create-post pathways. The composer route calls `createComposedPost`;
 * the LMS auto-trigger hooks (grand-test pass, cohort complete, badge
 * earned) call `createAutoPost`. Both funnel through a single insert
 * with a small denormalisation of `postCount` on the profile.
 *
 * Auto-posts have a partial-UNIQUE index in the DB on
 * (source, linkedEntityId), so calling `createAutoPost` twice for the
 * same achievement is a no-op — safe to retry from any hook.
 */

function newPostId(): string {
  return `p_${randomUUID().replace(/-/g, '').slice(0, 20)}`
}

// ── composed posts ───────────────────────────────────────────

export async function createComposedPost(args: {
  authorId: string
  kind: PostKind
  body: string
  tags?: string[]
  mediaUrl?: string
}): Promise<{ id: string }> {
  const id = newPostId()
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `INSERT INTO "CommunityPost"
         ("id", "authorId", "kind", "body", "tags", "mediaUrl", "source")
       VALUES ($1, $2, $3, $4, $5, $6, 'composed')`,
      id,
      args.authorId,
      args.kind,
      args.body,
      args.tags ?? [],
      args.mediaUrl ?? null,
    )
    await tx.$executeRawUnsafe(
      `UPDATE "CommunityProfile" SET "postCount" = "postCount" + 1
        WHERE "userId" = $1`,
      args.authorId,
    )
  })
  return { id }
}

// ── auto-generated posts ─────────────────────────────────────

/**
 * Insert an auto-generated post from an LMS trigger. Idempotent —
 * the DB has a partial UNIQUE index on (source, linkedEntityId) that
 * only fires for auto:% sources, so a retry does nothing.
 *
 * Returns { created: true, id } on the first call, { created: false }
 * on subsequent calls for the same entity.
 */
export async function createAutoPost(args: {
  authorId: string
  kind: PostKind
  source: PostSource
  body: string
  linkedEntityType: string
  linkedEntityId: string
  tags?: string[]
}): Promise<{ created: boolean; id?: string }> {
  if (!args.source.startsWith('auto:')) {
    throw new Error(`[community] createAutoPost called with non-auto source: ${args.source}`)
  }
  // Ensure the author has a profile row first — auto-posts often fire
  // before the user has visited the community area.
  await prisma.$queryRawUnsafe<{ id: string; email: string; name: string | null }[]>(
    `SELECT id, email, name FROM "IdentityUser" WHERE id = $1 LIMIT 1`,
    args.authorId,
  ).then(async (rows) => {
    const u = rows[0]
    if (u) await ensureProfile({ id: u.id, name: u.name, email: u.email })
  })

  const id = newPostId()
  const result = await prisma.$transaction(async (tx) => {
    // Try insert. The partial UNIQUE index will raise 23505 on a dup.
    try {
      await tx.$executeRawUnsafe(
        `INSERT INTO "CommunityPost"
           ("id", "authorId", "kind", "body", "tags", "source",
            "linkedEntityType", "linkedEntityId")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        id,
        args.authorId,
        args.kind,
        args.body,
        args.tags ?? [],
        args.source,
        args.linkedEntityType,
        args.linkedEntityId,
      )
      await tx.$executeRawUnsafe(
        `UPDATE "CommunityProfile" SET "postCount" = "postCount" + 1
          WHERE "userId" = $1`,
        args.authorId,
      )
      return { created: true, id }
    } catch (err) {
      // 23505 = unique_violation. Anything else is a real error.
      const code = (err as { code?: string }).code
      if (code === '23505') return { created: false }
      throw err
    }
  })

  // Ping the recipient — "your achievement just landed on your
  // profile" so they see it in the bell before spotting it in the
  // feed. Silent on error; the post is already saved.
  if (result.created) {
    void pushNotification({
      recipientId: args.authorId,
      actorId: null,
      type: 'milestone-post',
      subjectType: 'post',
      subjectId: id,
      snippet: args.body.slice(0, 80),
    }).catch(() => {})
  }
  return result
}
