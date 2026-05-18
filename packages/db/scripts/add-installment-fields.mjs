// One-off: add installment-tracking columns to CohortApplication.
//
// New fields:
//   - paymentPlan          'full' | 'installment-2'
//   - totalAmountMinor     full cohort fee (so 'partial' rows know the target)
//   - paidAmountMinor      running total — bumped on each successful payment
//   - nextInstallmentDueAt due date for the next outstanding installment
//
// Status semantics stay backwards compatible:
//   - 'pending'  → application created, no payment yet
//   - 'paid'     → at least one payment captured; user has access. balance =
//                  totalAmountMinor - paidAmountMinor. Frontend shows a
//                  'pay balance' link until paidAmountMinor === totalAmountMinor.
//   - 'failed' / 'refunded' as before.

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
  ALTER TABLE "CohortApplication"
  ADD COLUMN IF NOT EXISTS "paymentPlan" TEXT NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS "totalAmountMinor" INTEGER,
  ADD COLUMN IF NOT EXISTS "paidAmountMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "nextInstallmentDueAt" TIMESTAMP(3)
`)
console.log('✓ CohortApplication installment columns')

// Backfill: existing paid applications have paid the full amount, so set
// paidAmountMinor = amountMinor and totalAmountMinor = amountMinor.
const updated = await p.$executeRaw`
  UPDATE "CohortApplication"
  SET "totalAmountMinor" = COALESCE("totalAmountMinor", "amountMinor"),
      "paidAmountMinor"  = CASE WHEN "status" = 'paid' THEN "amountMinor" ELSE 0 END
  WHERE "totalAmountMinor" IS NULL OR "paidAmountMinor" = 0
`
console.log(`✓ Backfilled ${updated} rows`)

await p.$disconnect()
console.log('\nInstallment fields ready')
