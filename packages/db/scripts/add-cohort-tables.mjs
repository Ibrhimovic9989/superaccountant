// One-shot: create Cohort + CohortApplication tables and seed the
// first Indian-track cohort (Mumbai, starts 1 Jun 2026, ₹24,999 from ₹50k).
//
// All money is stored in the smallest currency unit (paise / halalas)
// to avoid floating-point rounding bugs anywhere in the payment path.
// E.g. ₹24,999 = 2,499,900 paise.
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

// ── Schema ─────────────────────────────────────────────────────

await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "Cohort" (
    "id" TEXT PRIMARY KEY,
    "slug" TEXT UNIQUE NOT NULL,
    "track" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "startDate" DATE NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 45,
    "currency" TEXT NOT NULL,
    "originalPriceMinor" INTEGER NOT NULL,
    "discountedPriceMinor" INTEGER NOT NULL,
    "seatsTotal" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
  )
`)
console.log('✓ Cohort table')

await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "CohortApplication" (
    "id" TEXT PRIMARY KEY,
    "cohortId" TEXT NOT NULL REFERENCES "Cohort"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "jobGoal" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
  )
`)
console.log('✓ CohortApplication table')

// One application per (cohort, email) — prevents double-charge churn.
await p.$executeRawUnsafe(`
  CREATE UNIQUE INDEX IF NOT EXISTS "CohortApplication_unique_idx"
  ON "CohortApplication" ("cohortId", "email")
`)
await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "CohortApplication_status_idx"
  ON "CohortApplication" ("cohortId", "status")
`)
console.log('✓ indexes')

// ── Seed: Indian-track Mumbai cohort starting 1 Jun 2026 ──────

const SEED_ID = 'cohort-mumbai-jun-2026'
const existing = await p.$queryRaw`SELECT "id" FROM "Cohort" WHERE "id" = ${SEED_ID} LIMIT 1`
if (existing.length === 0) {
  await p.$executeRaw`
    INSERT INTO "Cohort" (
      "id", "slug", "track", "name", "city",
      "startDate", "durationDays",
      "currency", "originalPriceMinor", "discountedPriceMinor",
      "seatsTotal", "status"
    ) VALUES (
      ${SEED_ID},
      ${'mumbai-jun-2026'},
      ${'india'},
      ${'Mumbai — June 2026'},
      ${'Mumbai'},
      ${'2026-06-01'}::date,
      ${45},
      ${'INR'},
      ${5000000},
      ${2499900},
      ${30},
      ${'open'}
    )
  `
  console.log(`✓ Seeded cohort ${SEED_ID} (₹24,999 from ₹50,000, starts 1 Jun 2026)`)
} else {
  console.log(`· Cohort ${SEED_ID} already seeded — leaving as-is`)
}

await p.$disconnect()
console.log('\nCohort tables ready')
