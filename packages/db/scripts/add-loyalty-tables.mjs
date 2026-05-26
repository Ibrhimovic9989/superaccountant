// One-shot: create SA Points loyalty system tables.
//
// SA Points = SuperAccountant's reward currency.
//   1 SA point = 1 INR (always).
//   22 SA points = 1 SAR (fixed conversion rate).
//
// Money is in smallest currency units everywhere (paise / halalas) to
// avoid floating-point bugs. SA points are stored as plain integers
// because they're already the smallest unit of themselves (1 point =
// indivisible).
//
// Schema:
//   LoyaltyWallet              — one row per user (1:1 with IdentityUser)
//   LoyaltyLedgerEntry         — credit / debit / expiry rows. Balance is
//                                computed from this ledger, never stored.
//                                Auditable + reconcilable.
//   LoyaltyMilestoneAchievement — idempotency table. (userId, milestoneKey)
//                                is UNIQUE — same milestone can't double-pay.

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

// ── LoyaltyWallet ──────────────────────────────────────────────
// One per user. Created lazily on first credit. Holds no balance —
// balance is computed by summing the ledger.
await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "LoyaltyWallet" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE REFERENCES "IdentityUser"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
  )
`)
console.log('✓ LoyaltyWallet table')

// ── LoyaltyLedgerEntry ────────────────────────────────────────
// Every change to a wallet's balance lives here. Type discriminates
// direction; points is always positive. Compute balance =
// SUM(credit.points) − SUM(debit.points) − SUM(expiry.points).
//
// expiresAt is set ONLY on credits, 12 months from createdAt. A nightly
// cron will create a matching 'expiry' debit for unconsumed expired
// credits (out of scope for this migration — see §SA Points cron).
await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "LoyaltyLedgerEntry" (
    "id" TEXT PRIMARY KEY,
    "walletId" TEXT NOT NULL REFERENCES "LoyaltyWallet"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL CHECK ("type" IN ('credit', 'debit', 'expiry')),
    "points" INTEGER NOT NULL CHECK ("points" > 0),
    "reason" TEXT NOT NULL,
    "milestoneKey" TEXT,
    "cohortApplicationId" TEXT REFERENCES "CohortApplication"("id") ON DELETE SET NULL,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
  )
`)
console.log('✓ LoyaltyLedgerEntry table')

// Indexes for the hot paths:
//   - history list (wallet + chronological)
//   - balance computation (wallet + type)
//   - expiry sweep (active credits past their expiresAt)
await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "LoyaltyLedgerEntry_wallet_created_idx"
  ON "LoyaltyLedgerEntry" ("walletId", "createdAt" DESC)
`)
await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "LoyaltyLedgerEntry_wallet_type_idx"
  ON "LoyaltyLedgerEntry" ("walletId", "type")
`)
await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "LoyaltyLedgerEntry_expiry_sweep_idx"
  ON "LoyaltyLedgerEntry" ("type", "expiresAt")
  WHERE "type" = 'credit'
`)
console.log('✓ LoyaltyLedgerEntry indexes')

// ── LoyaltyMilestoneAchievement ───────────────────────────────
// Idempotency table. Each (userId, milestoneKey) collapses to one row.
// Awards are recorded here AND in the ledger; this table prevents the
// same milestone from double-crediting.
//
// milestoneKey conventions:
//   phase_complete:<phaseId>   — 200 SA per phase, 4 times total
//   grand_test_pass            — 1000 SA, once
//   referral:<referredUserId>  — 1000 SA per converted referral
await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "LoyaltyMilestoneAchievement" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "IdentityUser"("id") ON DELETE CASCADE,
    "milestoneKey" TEXT NOT NULL,
    "pointsAwarded" INTEGER NOT NULL CHECK ("pointsAwarded" > 0),
    "ledgerEntryId" TEXT REFERENCES "LoyaltyLedgerEntry"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
  )
`)
await p.$executeRawUnsafe(`
  CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyMilestoneAchievement_unique_idx"
  ON "LoyaltyMilestoneAchievement" ("userId", "milestoneKey")
`)
await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "LoyaltyMilestoneAchievement_user_idx"
  ON "LoyaltyMilestoneAchievement" ("userId", "createdAt" DESC)
`)
console.log('✓ LoyaltyMilestoneAchievement table + indexes')

await p.$disconnect()
console.log('\nLoyalty tables ready. Run `pnpm --filter @sa/db generate` to refresh the Prisma client.')
