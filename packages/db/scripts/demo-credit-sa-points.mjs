#!/usr/bin/env node
/**
 * Demo helper: credit N SA points directly to a user's wallet.
 *
 * Bypasses the milestone idempotency table — this is NOT a real
 * milestone (no LoyaltyMilestoneAchievement row), it's just a raw
 * credit ledger entry so we can demo the wallet UI + checkout
 * redemption without grinding through real curriculum phases.
 *
 * Safe to re-run — each run adds another credit entry. Reverse with
 * --revoke (writes a matching debit, keeps the ledger auditable).
 *
 * Usage:
 *   node scripts/demo-credit-sa-points.mjs --email=ibrahimshaheer91@gmail.com --points=2500
 *   node scripts/demo-credit-sa-points.mjs --email=... --points=2500 --reason="Cohort demo"
 *   node scripts/demo-credit-sa-points.mjs --email=... --points=2500 --dry-run
 *   node scripts/demo-credit-sa-points.mjs --email=... --revoke   (writes debit to zero the wallet)
 */

import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__d, '..')

for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const argv = process.argv.slice(2)
const email = argv.find((a) => a.startsWith('--email='))?.slice(8)?.trim().toLowerCase()
const points = Number(argv.find((a) => a.startsWith('--points='))?.slice(9) ?? '0')
const reason = argv.find((a) => a.startsWith('--reason='))?.slice(9)?.trim() ?? 'Demo credit (manual)'
const isDryRun = argv.includes('--dry-run')
const isRevoke = argv.includes('--revoke')

if (!email) die('--email=<address> required')
if (!isRevoke && (!Number.isInteger(points) || points <= 0)) {
  die('--points=<positive integer> required (or pass --revoke)')
}

const { PrismaClient } = await import('@prisma/client')
const p = new PrismaClient()

const user = await p.identityUser.findUnique({
  where: { email },
  select: { id: true, email: true, name: true },
})
if (!user) die(`No IdentityUser with email ${email}`)
console.log(`✓ user: ${user.email} (${user.id}${user.name ? ` · ${user.name}` : ''})`)

// Get-or-create wallet
let wallet = await p.$queryRaw`
  SELECT "id" FROM "LoyaltyWallet" WHERE "userId" = ${user.id} LIMIT 1
`
if (wallet.length === 0) {
  const id = randomUUID()
  await p.$executeRaw`
    INSERT INTO "LoyaltyWallet" ("id", "userId") VALUES (${id}, ${user.id})
    ON CONFLICT ("userId") DO NOTHING
  `
  wallet = await p.$queryRaw`
    SELECT "id" FROM "LoyaltyWallet" WHERE "userId" = ${user.id} LIMIT 1
  `
  console.log(`✓ wallet created: ${wallet[0].id}`)
} else {
  console.log(`✓ wallet: ${wallet[0].id}`)
}
const walletId = wallet[0].id

// Current balance snapshot (for confirm)
const before = await p.$queryRaw`
  SELECT "type", SUM("points")::int AS "sum"
  FROM "LoyaltyLedgerEntry"
  WHERE "walletId" = ${walletId}
  GROUP BY "type"
`
const credits = before.find((r) => r.type === 'credit')?.sum ?? 0
const debits = before.find((r) => r.type === 'debit')?.sum ?? 0
const expiries = before.find((r) => r.type === 'expiry')?.sum ?? 0
const available = Math.max(0, credits - debits - expiries)
console.log(`  balance before: ${available} SA (credits ${credits} − debits ${debits} − expiries ${expiries})`)

if (isDryRun) {
  console.log(`\n(dry run) would ${isRevoke ? 'debit' : 'credit'} ${isRevoke ? available : points} SA. No write.`)
  await p.$disconnect()
  process.exit(0)
}

if (isRevoke) {
  if (available <= 0) {
    console.log('Nothing to revoke — wallet is already at 0.')
    await p.$disconnect()
    process.exit(0)
  }
  const id = randomUUID()
  await p.$executeRaw`
    INSERT INTO "LoyaltyLedgerEntry" ("id", "walletId", "type", "points", "reason")
    VALUES (${id}, ${walletId}, 'debit', ${available}, ${'Demo revoke (manual)'})
  `
  console.log(`✓ debited ${available} SA → balance now 0. ledger entry: ${id}`)
  await p.$disconnect()
  process.exit(0)
}

// 12-month expiry, matching the production milestone policy.
const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
const id = randomUUID()
await p.$executeRaw`
  INSERT INTO "LoyaltyLedgerEntry" ("id", "walletId", "type", "points", "reason", "expiresAt")
  VALUES (${id}, ${walletId}, 'credit', ${points}, ${reason}, ${expiresAt})
`
console.log(`✓ credited ${points} SA → balance now ${available + points}. ledger entry: ${id}`)
console.log(`  expires: ${expiresAt.toISOString().slice(0, 10)}`)

await p.$disconnect()

function die(msg) {
  console.error(`[demo-credit] ERROR: ${msg}`)
  process.exit(1)
}
