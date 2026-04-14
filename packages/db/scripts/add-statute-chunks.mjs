// One-shot: create StatuteChunk table + pgvector index.
//
// Each row = one searchable passage from a statute, regulation, or standard.
// Powers the search_statutes tool on the tutor — so answers cite exact
// section numbers grounded in the real legislation, not paraphrased.
//
// Sources are seeded from YAML files in contexts/statutes/ via
// scripts/ingest-statutes.mjs.
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
const { PrismaClient } = await import('@prisma/client')
const p = new PrismaClient()

await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "StatuteChunk" (
    "id" TEXT PRIMARY KEY,
    "jurisdiction" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceShort" TEXT NOT NULL,
    "sectionCode" TEXT NOT NULL,
    "sectionTitle" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "sourceUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
  );
`)
console.log('✓ StatuteChunk table')

// Add embedding column separately — vector type not in Prisma-friendly DDL
await p.$executeRawUnsafe(`
  ALTER TABLE "StatuteChunk" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
`)
console.log('✓ embedding column')

// HNSW index for fast cosine similarity search
await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "StatuteChunk_embedding_idx"
  ON "StatuteChunk" USING hnsw ("embedding" vector_cosine_ops);
`)
console.log('✓ HNSW index')

// Filter indexes for jurisdiction + locale
await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "StatuteChunk_jurisdiction_idx"
  ON "StatuteChunk" ("jurisdiction", "locale");
`)
await p.$executeRawUnsafe(`
  CREATE UNIQUE INDEX IF NOT EXISTS "StatuteChunk_unique_idx"
  ON "StatuteChunk" ("source", "sectionCode", "locale");
`)
console.log('✓ filter + unique indexes')

await p.$disconnect()
console.log('\nStatuteChunk ready.')
