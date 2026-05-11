// One-shot: create the MarketingLead table — captures top-of-funnel leads
// from the /quiz page (and any future marketing surface).
//
// Fields are deliberately denormalised + dependency-free of IdentityUser:
// most leads will never create an account.
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
  CREATE TABLE IF NOT EXISTS "MarketingLead" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "source" TEXT NOT NULL,
    "quizSlug" TEXT,
    "quizScore" INTEGER,
    "quizBucket" TEXT,
    "quizAnswers" JSONB,
    "locale" TEXT,
    "track" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
  )
`)
console.log('✓ MarketingLead table')

await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "MarketingLead_email_idx"
  ON "MarketingLead" ("email")
`)
await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "MarketingLead_source_createdAt_idx"
  ON "MarketingLead" ("source", "createdAt" DESC)
`)
console.log('✓ indexes')

await p.$disconnect()
console.log('\nMarketingLead ready')
