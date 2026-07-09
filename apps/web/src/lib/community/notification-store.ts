import 'server-only'
import { randomUUID } from 'node:crypto'
import { prisma } from '@sa/db'

/**
 * Notification writer + reader.
 *
 * Writer is idempotent thanks to the partial UNIQUE on
 * (recipient, type, actor, subject) — a spam-click on Like/Unlike/Like
 * only produces one notification row.
 *
 * Reader is optimised for the two hottest queries: (a) unread count
 * for the bell (partial index), (b) most-recent 30 for the drawer.
 */

export type NotificationType = 'like' | 'comment' | 'follow' | 'milestone-post' | 'mention'
export type SubjectType = 'post' | 'comment' | 'profile' | null

function newNotificationId(): string {
  return `n_${randomUUID().replace(/-/g, '').slice(0, 20)}`
}

/**
 * Insert a notification. Silently no-ops when:
 *   - recipient === actor (self-notification)
 *   - the (recipient, type, actor, subject) tuple already exists
 * Anything else that fails is logged + swallowed — a broken notif
 * must never block the underlying user action.
 */
export async function pushNotification(args: {
  recipientId: string
  actorId: string | null
  type: NotificationType
  subjectType?: SubjectType
  subjectId?: string | null
  snippet?: string | null
}): Promise<void> {
  if (args.actorId && args.actorId === args.recipientId) return
  try {
    const id = newNotificationId()
    await prisma.$executeRawUnsafe(
      `INSERT INTO "CommunityNotification"
         ("id", "recipientId", "actorId", "type", "subjectType", "subjectId", "snippet")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      id,
      args.recipientId,
      args.actorId,
      args.type,
      args.subjectType ?? null,
      args.subjectId ?? null,
      args.snippet ?? null,
    )
  } catch (err) {
    console.warn('[notification] push failed', {
      err: (err as Error).message,
      recipientId: args.recipientId,
      type: args.type,
    })
  }
}

/**
 * Unread-count for the bell. Uses the partial index — sub-ms even
 * with a million rows in the table.
 */
export async function countUnread(recipientId: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT COUNT(*)::bigint AS n
       FROM "CommunityNotification"
      WHERE "recipientId" = $1 AND "readAt" IS NULL`,
    recipientId,
  )
  return Number(rows[0]?.n ?? 0)
}

export type NotificationRow = {
  id: string
  type: NotificationType
  actorId: string | null
  actorName: string | null
  actorHandle: string | null
  actorAvatarUrl: string | null
  subjectType: SubjectType
  subjectId: string | null
  snippet: string | null
  createdAt: string
  read: boolean
}

/**
 * Latest N notifications for a recipient. Joins in the actor's name
 * + handle + avatar so the drawer renders without a per-row lookup.
 */
export async function listNotifications(
  recipientId: string,
  limit = 30,
): Promise<NotificationRow[]> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string
      type: NotificationType
      actorId: string | null
      actorName: string | null
      actorHandle: string | null
      actorAvatarUrl: string | null
      subjectType: SubjectType
      subjectId: string | null
      snippet: string | null
      createdAt: Date
      readAt: Date | null
    }>
  >(
    `SELECT
       n.id, n.type, n."actorId",
       iu.name AS "actorName",
       iu.image AS "actorAvatarUrl",
       cp.handle AS "actorHandle",
       n."subjectType", n."subjectId", n.snippet,
       n."createdAt", n."readAt"
     FROM "CommunityNotification" n
     LEFT JOIN "IdentityUser" iu ON iu.id = n."actorId"
     LEFT JOIN "CommunityProfile" cp ON cp."userId" = n."actorId"
     WHERE n."recipientId" = $1
     ORDER BY n."createdAt" DESC
     LIMIT $2`,
    recipientId,
    limit,
  )
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    actorId: r.actorId,
    actorName: r.actorName,
    actorHandle: r.actorHandle,
    actorAvatarUrl: r.actorAvatarUrl,
    subjectType: r.subjectType,
    subjectId: r.subjectId,
    snippet: r.snippet,
    createdAt: r.createdAt.toISOString(),
    read: r.readAt !== null,
  }))
}

/**
 * Mark ALL notifications read for a user. Called when they open the
 * drawer — simpler + friendlier than per-row read tracking, and it's
 * fine because the drawer surfaces "recent" not "unread".
 */
export async function markAllRead(recipientId: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "CommunityNotification"
        SET "readAt" = NOW()
      WHERE "recipientId" = $1 AND "readAt" IS NULL`,
    recipientId,
  )
}
