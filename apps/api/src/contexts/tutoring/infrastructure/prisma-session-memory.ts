import { prisma } from '@sa/db'
import type { SessionMemoryEntry, SessionMemoryPort } from '../domain/session'

/**
 * Prisma-backed session memory. Per CLAUDE.md §4.4, memory is files-first
 * (a markdown body), augmented by vectors. We store one row per (sessionId, kind)
 * and overwrite on upsert — the agent treats it like a file.
 */
export class PrismaSessionMemory implements SessionMemoryPort {
  async list(sessionId: string): Promise<SessionMemoryEntry[]> {
    const rows = await prisma.tutoringSessionMemory.findMany({
      where: { sessionId },
      orderBy: { updatedAt: 'desc' },
    })
    return rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      kind: r.kind as SessionMemoryEntry['kind'],
      bodyMd: r.bodyMd,
      updatedAt: r.updatedAt,
    }))
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
    return {
      id: row.id,
      sessionId: row.sessionId,
      kind: row.kind as SessionMemoryEntry['kind'],
      bodyMd: row.bodyMd,
      updatedAt: row.updatedAt,
    }
  }
}
