-- pgvector setup. Run AFTER `prisma migrate dev` creates the base tables.
-- Adds 1536-dim embedding columns and HNSW indexes to lessons + session memory.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "CurriculumLesson"
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS curriculum_lesson_embedding_idx
  ON "CurriculumLesson"
  USING hnsw (embedding vector_cosine_ops);

ALTER TABLE "TutoringSessionMemory"
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS tutoring_session_memory_embedding_idx
  ON "TutoringSessionMemory"
  USING hnsw (embedding vector_cosine_ops);

-- Per-section embeddings table (one row per section per lesson per locale).
-- Prisma cannot model vector columns cleanly, so this is fully managed via raw SQL.
CREATE TABLE IF NOT EXISTS "CurriculumLessonChunk" (
  "id" TEXT PRIMARY KEY,
  "lessonId" TEXT NOT NULL REFERENCES "CurriculumLesson"("id") ON DELETE CASCADE,
  "locale" TEXT NOT NULL,
  "heading" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "embedding" vector(1536) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS curriculum_lesson_chunk_lesson_idx
  ON "CurriculumLessonChunk" ("lessonId");

CREATE INDEX IF NOT EXISTS curriculum_lesson_chunk_embedding_idx
  ON "CurriculumLessonChunk"
  USING hnsw (embedding vector_cosine_ops);
