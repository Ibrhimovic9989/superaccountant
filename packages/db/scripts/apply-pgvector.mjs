// One-shot: apply the pgvector raw SQL migration via the Prisma client.
// Used because the dev environment has no `psql` binary.
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname0 = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname0, '../.env')
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const { PrismaClient } = await import('@prisma/client')

const statements = [
  `CREATE EXTENSION IF NOT EXISTS vector`,
  `ALTER TABLE "CurriculumLesson" ADD COLUMN IF NOT EXISTS embedding vector(1536)`,
  `CREATE INDEX IF NOT EXISTS curriculum_lesson_embedding_idx
     ON "CurriculumLesson" USING hnsw (embedding vector_cosine_ops)`,
  `ALTER TABLE "TutoringSessionMemory" ADD COLUMN IF NOT EXISTS embedding vector(1536)`,
  `CREATE INDEX IF NOT EXISTS tutoring_session_memory_embedding_idx
     ON "TutoringSessionMemory" USING hnsw (embedding vector_cosine_ops)`,
  `CREATE TABLE IF NOT EXISTS "CurriculumLessonChunk" (
     "id"        TEXT PRIMARY KEY,
     "lessonId"  TEXT NOT NULL REFERENCES "CurriculumLesson"("id") ON DELETE CASCADE,
     "locale"    TEXT NOT NULL,
     "heading"   TEXT NOT NULL,
     "body"      TEXT NOT NULL,
     "embedding" vector(1536) NOT NULL,
     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS curriculum_lesson_chunk_lesson_idx
     ON "CurriculumLessonChunk" ("lessonId")`,
  `CREATE INDEX IF NOT EXISTS curriculum_lesson_chunk_embedding_idx
     ON "CurriculumLessonChunk" USING hnsw (embedding vector_cosine_ops)`,
]

const prisma = new PrismaClient()
try {
  for (const stmt of statements) {
    process.stdout.write(`→ ${stmt.split('\n')[0].slice(0, 80).trim()}... `)
    await prisma.$executeRawUnsafe(stmt)
    process.stdout.write('OK\n')
  }
  console.log('\npgvector migration applied.')
} catch (err) {
  console.error('\nFAILED:', err.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
