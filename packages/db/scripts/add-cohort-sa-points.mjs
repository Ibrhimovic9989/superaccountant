// Add SA Points fields to CohortApplication so the Razorpay webhook
// can resolve "this paid order = N points to debit from the user's
// wallet" when payment.captured fires.
//
// Two columns added (both default 0 for existing rows):
//   saPointsRequested      — points the user CHOSE to spend at apply time
//   saPointsDiscountMinor  — the discount in paise/halalas that those
//                            points produced. Stored for receipts / refunds.
//
// We do NOT track "saPointsApplied" — the actual debit lives in
// LoyaltyLedgerEntry (one row per debit, joined back via
// cohortApplicationId). Single source of truth.

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
  ADD COLUMN IF NOT EXISTS "saPointsRequested" INTEGER NOT NULL DEFAULT 0
`)
console.log('✓ CohortApplication.saPointsRequested')

await p.$executeRawUnsafe(`
  ALTER TABLE "CohortApplication"
  ADD COLUMN IF NOT EXISTS "saPointsDiscountMinor" INTEGER NOT NULL DEFAULT 0
`)
console.log('✓ CohortApplication.saPointsDiscountMinor')

// Defensive idempotency for redemption commits: at most ONE debit
// ledger entry per (cohortApplicationId). The Razorpay webhook can
// retry; this UNIQUE prevents a double-debit even if the application
// layer's idempotency check loses a race.
await p.$executeRawUnsafe(`
  CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyLedgerEntry_one_debit_per_application_idx"
  ON "LoyaltyLedgerEntry" ("cohortApplicationId")
  WHERE "type" = 'debit' AND "cohortApplicationId" IS NOT NULL
`)
console.log('✓ LoyaltyLedgerEntry one-debit-per-application unique index')

await p.$disconnect()
console.log('\nCohort SA Points columns + uniqueness ready.')
