import { randomUUID } from 'node:crypto'
import { prisma } from '@sa/db'

/**
 * Server-side SA Points wallet access for the Next.js web app.
 *
 * Mirror of the NestJS LoyaltyService but talks directly to the same
 * Prisma DB (raw SQL — the loyalty tables aren't declared in
 * schema.prisma, matching the cohort pattern). Dashboard reads and
 * checkout writes go through here so we don't pay an HTTP round-trip
 * inside a server component / server action.
 *
 * Mutating operations (commitRedemption) must stay in lockstep with
 * apps/api/src/contexts/loyalty/application/loyalty.service.ts —
 * specifically the idempotency check + the partial UNIQUE index on
 * (cohortApplicationId, type='debit'). Both implementations rely on
 * the index to prevent double-debits under concurrent writes.
 */

export type WalletBalance = {
  available: number
  pendingExpiry: number
  lifetimeEarned: number
}

export type LedgerType = 'credit' | 'debit' | 'expiry'

export type WalletHistoryItem = {
  id: string
  type: LedgerType
  points: number
  reason: string
  milestoneKey: string | null
  cohortApplicationId: string | null
  expiresAt: Date | null
  createdAt: Date
  balanceAfter: number
}

// ── Wallet creation + balance ────────────────────────────────

export async function getOrCreateWallet(userId: string): Promise<{ id: string }> {
  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "LoyaltyWallet" WHERE "userId" = ${userId} LIMIT 1
  `
  if (existing[0]) return existing[0]
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO "LoyaltyWallet" ("id", "userId")
    VALUES (${id}, ${userId})
    ON CONFLICT ("userId") DO NOTHING
  `
  const row = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "LoyaltyWallet" WHERE "userId" = ${userId} LIMIT 1
  `
  if (!row[0]) throw new Error('[loyalty] failed to create wallet')
  return row[0]
}

export async function getWalletBalance(userId: string): Promise<WalletBalance> {
  const wallet = await getOrCreateWallet(userId)
  const rows = await prisma.$queryRaw<
    Array<{ type: LedgerType; points: number; expiresAt: Date | null }>
  >`
    SELECT "type", "points", "expiresAt"
    FROM "LoyaltyLedgerEntry"
    WHERE "walletId" = ${wallet.id}
  `
  const now = Date.now()
  let credits = 0
  let debits = 0
  let expiries = 0
  let pendingExpiry = 0
  let lifetimeEarned = 0
  for (const r of rows) {
    if (r.type === 'credit') {
      lifetimeEarned += r.points
      if (r.expiresAt !== null && r.expiresAt.getTime() <= now) {
        pendingExpiry += r.points
      } else {
        credits += r.points
      }
    } else if (r.type === 'debit') {
      debits += r.points
    } else {
      expiries += r.points
    }
  }
  return {
    available: Math.max(0, credits - debits - expiries),
    pendingExpiry,
    lifetimeEarned,
  }
}

export async function getWalletHistory(
  userId: string,
  limit = 50,
): Promise<WalletHistoryItem[]> {
  const wallet = await getOrCreateWallet(userId)
  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      type: LedgerType
      points: number
      reason: string
      milestoneKey: string | null
      cohortApplicationId: string | null
      expiresAt: Date | null
      createdAt: Date
    }>
  >`
    SELECT "id", "type", "points", "reason", "milestoneKey",
           "cohortApplicationId", "expiresAt", "createdAt"
    FROM "LoyaltyLedgerEntry"
    WHERE "walletId" = ${wallet.id}
    ORDER BY "createdAt" ASC
  `
  let running = 0
  const folded: WalletHistoryItem[] = []
  for (const r of rows) {
    const delta = r.type === 'credit' ? r.points : -r.points
    running += delta
    folded.push({ ...r, balanceAfter: running })
  }
  return folded.reverse().slice(0, limit)
}

// ── Redemption commit (idempotent) ────────────────────────────

/**
 * Debit `points` from `userId`'s wallet, tagged with the cohort
 * application id. Called from the Razorpay webhook on payment.captured.
 *
 * Idempotent on `cohortApplicationId`: a partial UNIQUE index on
 * LoyaltyLedgerEntry (cohortApplicationId WHERE type='debit') prevents
 * a double-debit even if the webhook is retried.
 */
export async function commitRedemption(args: {
  userId: string
  points: number
  cohortApplicationId: string
  reason?: string
}): Promise<{ ledgerEntryId: string; alreadyDebited: boolean }> {
  if (args.points <= 0) throw new Error('[loyalty] points must be > 0')

  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "LoyaltyLedgerEntry"
    WHERE "cohortApplicationId" = ${args.cohortApplicationId}
      AND "type" = 'debit'
    LIMIT 1
  `
  if (existing[0]) return { ledgerEntryId: existing[0].id, alreadyDebited: true }

  const balance = await getWalletBalance(args.userId)
  if (balance.available < args.points) {
    throw new Error(
      `[loyalty] insufficient balance: have ${balance.available}, need ${args.points}`,
    )
  }
  const wallet = await getOrCreateWallet(args.userId)
  const id = randomUUID()
  try {
    await prisma.$executeRaw`
      INSERT INTO "LoyaltyLedgerEntry"
        ("id", "walletId", "type", "points", "reason", "cohortApplicationId")
      VALUES
        (${id}, ${wallet.id}, 'debit', ${args.points},
         ${args.reason ?? 'Cohort enrollment — SA Cash discount'},
         ${args.cohortApplicationId})
    `
    return { ledgerEntryId: id, alreadyDebited: false }
  } catch (e) {
    const msg = (e as Error).message ?? ''
    if (msg.includes('23505') || /unique/i.test(msg)) {
      const winner = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "LoyaltyLedgerEntry"
        WHERE "cohortApplicationId" = ${args.cohortApplicationId}
          AND "type" = 'debit'
        LIMIT 1
      `
      if (winner[0]) return { ledgerEntryId: winner[0].id, alreadyDebited: true }
    }
    throw e
  }
}

// ── Lookup helpers for the webhook ────────────────────────────

/**
 * Resolve the (userId, saPointsRequested) tuple for a paid Razorpay
 * order. The webhook needs this to figure out who to debit and how
 * much. Returns null if there's no matching application or it has no
 * SA Points attached.
 */
export async function getSaCashContextForOrder(
  razorpayOrderId: string,
): Promise<{
  applicationId: string
  userId: string
  saPointsRequested: number
} | null> {
  const rows = await prisma.$queryRaw<
    Array<{ id: string; email: string; saPointsRequested: number }>
  >`
    SELECT "id", "email", "saPointsRequested"
    FROM "CohortApplication"
    WHERE "razorpayOrderId" = ${razorpayOrderId}
    LIMIT 1
  `
  const app = rows[0]
  if (!app || app.saPointsRequested <= 0) return null

  // Email → IdentityUser id. CohortApplication doesn't store userId
  // directly (it's a public form); the email is the join key.
  const users = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "IdentityUser" WHERE LOWER("email") = LOWER(${app.email}) LIMIT 1
  `
  if (!users[0]) return null

  return {
    applicationId: app.id,
    userId: users[0].id,
    saPointsRequested: app.saPointsRequested,
  }
}
