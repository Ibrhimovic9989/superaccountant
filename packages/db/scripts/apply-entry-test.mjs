// Net-new EntryTestSession table. Stores per-session question history so the
// EntryTestAgent can run statelessly between requests.
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const { PrismaClient } = await import('@prisma/client')

const statements = [
  `CREATE TABLE IF NOT EXISTS "EntryTestSession" (
     "id"         TEXT PRIMARY KEY,
     "userId"     TEXT NOT NULL REFERENCES "IdentityUser"("id") ON DELETE CASCADE,
     "market"     TEXT NOT NULL,
     "locale"     TEXT NOT NULL,
     "history"    JSONB NOT NULL DEFAULT '[]'::jsonb,
     "score"      DOUBLE PRECISION,
     "placedPhase" INTEGER,
     "completedAt" TIMESTAMP(3),
     "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT now(),
     "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "EntryTestSession_userId_idx" ON "EntryTestSession"("userId")`,
]

const prisma = new PrismaClient()
try {
  for (const stmt of statements) {
    process.stdout.write(`→ ${stmt.split('\n')[0].slice(0, 80).trim()}... `)
    await prisma.$executeRawUnsafe(stmt)
    process.stdout.write('OK\n')
  }
  console.log('\nEntryTestSession ready.')
} catch (err) {
  console.error('\nFAILED:', err.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
