// One-shot: create the SA Points cheque-payout table.
//
// Adds the second redemption path: at certificate-issuance time a
// student can convert their wallet balance into a real cheque / bank
// transfer instead of holding the points for the next cohort discount.
//
// Workflow rows live in LoyaltyPayoutRequest. The DEBIT against the
// wallet is written into LoyaltyLedgerEntry (the canonical balance
// source) the moment a request is created — if the request is later
// rejected, a compensating CREDIT is written to return the points.
//
// Bank details are AES-256-GCM encrypted at the application layer (key
// derived from NEXTAUTH_SECRET). The DB stores ciphertext + IV + tag
// as base64 JSON so a leaked dump can't trivially expose account #s.

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

// ── LoyaltyPayoutRequest ───────────────────────────────────────
// One row per request. Status machine:
//   requested → approved → paid          (happy path)
//   requested → rejected                 (admin denies; points refunded)
//   approved  → rejected                 (admin denies after approval; points refunded)
//
// The compensating-credit on rejection is written by the application
// layer (rejectPayout in store + service) inside the same transaction
// that flips status to 'rejected'.
await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "LoyaltyPayoutRequest" (
    "id" TEXT PRIMARY KEY,
    "walletId" TEXT NOT NULL REFERENCES "LoyaltyWallet"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "IdentityUser"("id") ON DELETE CASCADE,
    "points" INTEGER NOT NULL CHECK ("points" > 0),
    "amountMinor" INTEGER NOT NULL CHECK ("amountMinor" > 0),
    "currency" TEXT NOT NULL CHECK ("currency" IN ('INR','SAR')),
    "status" TEXT NOT NULL DEFAULT 'requested'
      CHECK ("status" IN ('requested','approved','paid','rejected')),
    "bankDetailsEncrypted" TEXT,
    "notes" TEXT,
    "ledgerEntryId" TEXT REFERENCES "LoyaltyLedgerEntry"("id"),
    "processedByUserId" TEXT REFERENCES "IdentityUser"("id"),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
  )
`)
console.log('✓ LoyaltyPayoutRequest table')

// Hot paths:
//   - admin queue        : status + chronological
//   - student history    : userId + chronological
//   - duplicate-in-flight: partial UNIQUE on (userId) WHERE status IN
//                          ('requested','approved') prevents a student
//                          from stacking two open payouts at once.
await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "LoyaltyPayoutRequest_status_created_idx"
  ON "LoyaltyPayoutRequest" ("status", "createdAt" DESC)
`)
await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "LoyaltyPayoutRequest_user_created_idx"
  ON "LoyaltyPayoutRequest" ("userId", "createdAt" DESC)
`)
await p.$executeRawUnsafe(`
  CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyPayoutRequest_one_open_per_user_idx"
  ON "LoyaltyPayoutRequest" ("userId")
  WHERE "status" IN ('requested','approved')
`)
console.log('✓ LoyaltyPayoutRequest indexes')

await p.$disconnect()
console.log('\nCheque payout table ready.')
