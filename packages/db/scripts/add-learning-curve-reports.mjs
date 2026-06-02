// One-shot: create the LearningCurveReport table for the admin
// learning-curve PDF feature.
//
// One row per (userId, generatedAt) — admins can regenerate, but we
// look up by hash for verification. Hash is HMAC(NEXTAUTH_SECRET,
// `${userId}:${generatedAt.toISOString()}`).
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

await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "LearningCurveReport" (
    "id"                  TEXT PRIMARY KEY,
    "userId"              TEXT NOT NULL REFERENCES "IdentityUser"("id") ON DELETE CASCADE,
    "pdfUrl"              TEXT NOT NULL,
    "verifyHash"          TEXT NOT NULL UNIQUE,
    "generatedByUserId"   TEXT NOT NULL REFERENCES "IdentityUser"("id") ON DELETE RESTRICT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT NOW()
  )
`)
console.log('LearningCurveReport table')

await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "LearningCurveReport_user_createdAt_idx"
  ON "LearningCurveReport" ("userId", "createdAt" DESC)
`)
console.log('LearningCurveReport_user_createdAt_idx')

await p.$disconnect()
console.log('\nLearningCurveReport ready')
