// One-shot: (a) rename the active cohort from Mumbai → Hyderabad,
// (b) add the DiscountCode table, (c) add discount columns to
// CohortApplication, (d) seed the private `supertest100` code that
// gives 100% off — for hand-out to founder picks, NOT public.
//
// Idempotent: re-runs are safe.
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

// ── (a) Rename the seeded cohort to Hyderabad ────────────────
const renameResult = await p.$executeRaw`
  UPDATE "Cohort"
  SET "name" = 'Hyderabad — June 2026',
      "city" = 'Hyderabad',
      "updatedAt" = NOW()
  WHERE "id" = 'cohort-mumbai-jun-2026'
`
console.log(`✓ Cohort renamed to Hyderabad (rows: ${renameResult})`)

// ── (b) DiscountCode table ───────────────────────────────────
await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "DiscountCode" (
    "id" TEXT PRIMARY KEY,
    "code" TEXT UNIQUE NOT NULL,
    "discountPercent" INTEGER NOT NULL CHECK ("discountPercent" >= 0 AND "discountPercent" <= 100),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "cohortId" TEXT REFERENCES "Cohort"("id") ON DELETE CASCADE,
    "active" BOOLEAN NOT NULL DEFAULT TRUE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
  )
`)
console.log('✓ DiscountCode table')

// ── (c) Discount audit columns on CohortApplication ─────────
await p.$executeRawUnsafe(`
  ALTER TABLE "CohortApplication"
  ADD COLUMN IF NOT EXISTS "discountCode" TEXT,
  ADD COLUMN IF NOT EXISTS "discountPercent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "originalAmountMinor" INTEGER
`)
console.log('✓ CohortApplication discount columns')

// Razorpay order id is nullable for free enrollments (100% off skips Razorpay entirely).
await p.$executeRawUnsafe(`
  ALTER TABLE "CohortApplication"
  ALTER COLUMN "razorpayOrderId" DROP NOT NULL
`)
console.log('✓ razorpayOrderId is now nullable (for free enrollments)')

// ── (d) Seed supertest100 — 100% off, unlimited, never expires ────
const codeRows = await p.$queryRaw`
  SELECT "id" FROM "DiscountCode" WHERE LOWER("code") = 'supertest100' LIMIT 1
`
if (codeRows.length === 0) {
  await p.$executeRaw`
    INSERT INTO "DiscountCode" (
      "id", "code", "discountPercent", "maxUses", "active", "notes"
    ) VALUES (
      ${'disc-supertest100'},
      ${'supertest100'},
      ${100},
      ${null},
      ${true},
      ${'Private founder-pick code — 100% off, hand-out only.'}
    )
  `
  console.log('✓ Seeded supertest100 (100% off, unlimited uses)')
} else {
  console.log('· supertest100 already exists — leaving as-is')
}

await p.$disconnect()
console.log('\nDiscount codes ready')
