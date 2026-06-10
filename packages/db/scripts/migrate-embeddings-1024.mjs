// Embedding-dimension migration: 1536 → 1024 (Azure text-embedding-3-small → Jina v3).
//
// Background: Azure sponsorship ran out 2026-06-08; @sa/ai now embeds
// via Jina v3 at 1024 dims (MRL truncation). The old Azure vectors
// share neither the same dimension nor the same vector space, so they
// must be deleted and re-embedded.
//
// What this script does:
//   1. Drop HNSW indexes that pin the column dim.
//   2. ALTER each embedding column from vector(1536) to vector(1024)
//      via DROP COLUMN + ADD COLUMN (pgvector doesn't allow in-place
//      dim changes). Old vectors are lost — intentional.
//   3. Recreate the HNSW indexes at the new dim.
//
// Run AFTER deploying the Jina-based @sa/ai. Re-embedding lives in a
// separate script (reembed-via-jina.mjs) so this migration stays
// transactional and quick.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
const { PrismaClient } = await import('@prisma/client')
const p = new PrismaClient()

// CurriculumLesson.embedding ─────────────────────────────────
await p.$executeRawUnsafe(`DROP INDEX IF EXISTS curriculum_lesson_embedding_idx`)
await p.$executeRawUnsafe(`ALTER TABLE "CurriculumLesson" DROP COLUMN IF EXISTS embedding`)
await p.$executeRawUnsafe(`ALTER TABLE "CurriculumLesson" ADD COLUMN embedding vector(1024)`)
await p.$executeRawUnsafe(
  `CREATE INDEX curriculum_lesson_embedding_idx ON "CurriculumLesson" USING hnsw (embedding vector_cosine_ops)`,
)
console.log('✓ CurriculumLesson.embedding → vector(1024)')

// TutoringSessionMemory.embedding ────────────────────────────
await p.$executeRawUnsafe(`DROP INDEX IF EXISTS tutoring_session_memory_embedding_idx`)
await p.$executeRawUnsafe(`ALTER TABLE "TutoringSessionMemory" DROP COLUMN IF EXISTS embedding`)
await p.$executeRawUnsafe(`ALTER TABLE "TutoringSessionMemory" ADD COLUMN embedding vector(1024)`)
await p.$executeRawUnsafe(
  `CREATE INDEX tutoring_session_memory_embedding_idx ON "TutoringSessionMemory" USING hnsw (embedding vector_cosine_ops)`,
)
console.log('✓ TutoringSessionMemory.embedding → vector(1024)')

// CurriculumLessonChunk — full rebuild because chunks were embedding-NOT-NULL.
await p.$executeRawUnsafe(`DROP TABLE IF EXISTS "CurriculumLessonChunk"`)
await p.$executeRawUnsafe(`
  CREATE TABLE "CurriculumLessonChunk" (
    "id" TEXT PRIMARY KEY,
    "lessonId" TEXT NOT NULL REFERENCES "CurriculumLesson"("id") ON DELETE CASCADE,
    "locale" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "embedding" vector(1024) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`)
await p.$executeRawUnsafe(
  `CREATE INDEX curriculum_lesson_chunk_lesson_idx ON "CurriculumLessonChunk" ("lessonId")`,
)
await p.$executeRawUnsafe(
  `CREATE INDEX curriculum_lesson_chunk_embedding_idx ON "CurriculumLessonChunk" USING hnsw (embedding vector_cosine_ops)`,
)
console.log('✓ CurriculumLessonChunk recreated with vector(1024)')

await p.$disconnect()
console.log('\nEmbedding columns ready for re-embedding via Jina v3.')
console.log('Next: run packages/db/scripts/reembed-via-jina.mjs')
