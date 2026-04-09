import { prisma } from '@sa/db'
import type { SessionMemoryEntry, SessionMemoryPort } from '../domain/session'

/**
 * Prisma-backed session memory. Per CLAUDE.md §4.4, memory is files-first
 * (a markdown body), augmented by vectors. We store one row per (sessionId, kind)
 * and overwrite on upsert — the agent treats it like a file.
 */
export class PrismaSessionMemory implements SessionMemoryPort {
  /**
   * List memories for the current session, PLUS carry forward the most recent
   * `student` and `course` memories from the user's prior sessions. This gives
   * the tutor cross-session memory: "I remember you struggled with TDS last
   * week" without the student having to re-explain themselves.
   *
   * Implementation: we load all memories for THIS sessionId, then separately
   * query the most recent `student` and `course` entries from ANY session
   * owned by the same user (the userId prefix of the sessionId). If the
   * current session already has those kinds, the current ones win (deduped).
   */
  async list(sessionId: string): Promise<SessionMemoryEntry[]> {
    // Current session memories.
    const currentRows = await prisma.tutoringSessionMemory.findMany({
      where: { sessionId },
      orderBy: { updatedAt: 'desc' },
    })
    const current = currentRows.map(toEntry)
    const currentKinds = new Set(current.map((e) => e.kind))

    // Cross-session: load the most recent student + course memories from
    // the user's other sessions. The userId is the prefix before the first '-'.
    // Session IDs are formatted as `${userId}-${lessonSlug}` on the web side.
    const userId = sessionId.split('-').slice(0, 1).join('-')
    if (!userId || userId.length < 10) return current // safety: bad sessionId format

    const priorKinds = (['student', 'course'] as const).filter((k) => !currentKinds.has(k))
    if (priorKinds.length === 0) return current

    const priorRows = await prisma.$queryRaw<
      { id: string; sessionId: string; kind: string; bodyMd: string; updatedAt: Date }[]
    >`
      SELECT DISTINCT ON (m."kind")
        m."id", m."sessionId", m."kind", m."bodyMd", m."updatedAt"
      FROM "TutoringSessionMemory" m
      JOIN "TutoringSession" s ON m."sessionId" = s.id
      WHERE s."userId" = ${userId}
        AND m."sessionId" != ${sessionId}
        AND m."kind" = ANY(${priorKinds}::text[])
      ORDER BY m."kind", m."updatedAt" DESC
    `.catch(() => [] as never[])
    // ^ catch: if TutoringSession table doesn't have the right join shape,
    // degrade gracefully to current-session-only.

    const prior = priorRows.map(toEntry)
    return [...current, ...prior]
  }

  async upsert(args: {
    sessionId: string
    kind: SessionMemoryEntry['kind']
    bodyMd: string
  }): Promise<SessionMemoryEntry> {
    const existing = await prisma.tutoringSessionMemory.findFirst({
      where: { sessionId: args.sessionId, kind: args.kind },
    })
    const row = existing
      ? await prisma.tutoringSessionMemory.update({
          where: { id: existing.id },
          data: { bodyMd: args.bodyMd },
        })
      : await prisma.tutoringSessionMemory.create({
          data: { sessionId: args.sessionId, kind: args.kind, bodyMd: args.bodyMd },
        })
    return toEntry(row)
  }
}

function toEntry(r: {
  id: string
  sessionId: string
  kind: string
  bodyMd: string
  updatedAt: Date
}): SessionMemoryEntry {
  return {
    id: r.id,
    sessionId: r.sessionId,
    kind: r.kind as SessionMemoryEntry['kind'],
    bodyMd: r.bodyMd,
    updatedAt: r.updatedAt,
  }
}
