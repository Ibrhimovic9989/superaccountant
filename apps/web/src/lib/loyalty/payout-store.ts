import { randomUUID } from 'node:crypto'
import { prisma } from '@sa/db'
import { type SupportedCurrency, pointsToDiscountMinor } from './conversion'
import {
  type BankDetails,
  decryptBankDetails,
  encryptBankDetails,
  maskAccount,
} from './payout-crypto'
import { getOrCreateWallet, getWalletBalance } from './store'

/**
 * Cheque-payout store — second redemption rail for SA Points.
 *
 * Lives next to ./store.ts because both manipulate the same loyalty
 * tables and we want one place to look up wallet balance. The API
 * service (apps/api/src/contexts/loyalty/application/payout.service.ts)
 * mirrors these functions and MUST stay in lockstep — the partial
 * UNIQUE index on (userId) WHERE status IN (requested,approved) is the
 * single source of truth for idempotency.
 */

export type PayoutStatus = 'requested' | 'approved' | 'paid' | 'rejected'

export type PayoutRow = {
  id: string
  walletId: string
  userId: string
  points: number
  amountMinor: number
  currency: SupportedCurrency
  status: PayoutStatus
  bankDetailsEncrypted: string | null
  notes: string | null
  ledgerEntryId: string | null
  processedByUserId: string | null
  processedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type PayoutWithUser = PayoutRow & {
  userName: string | null
  userEmail: string
}

/** Already in flight → request rejected at the application layer. */
export class DuplicateOpenPayoutError extends Error {
  constructor() {
    super('You already have an open cheque payout request.')
    this.name = 'DuplicateOpenPayoutError'
  }
}

// ── Request (student-initiated) ──────────────────────────────

export async function requestPayout(args: {
  userId: string
  points: number
  currency: SupportedCurrency
  bankDetails?: BankDetails
}): Promise<{ payoutId: string; ledgerEntryId: string; amountMinor: number }> {
  if (args.points <= 0) throw new Error('[payout] points must be > 0')

  // Per-user idempotency — one open request at a time. The partial UNIQUE
  // index enforces this at the DB level, but we check up-front so the
  // student sees a clean error instead of a Postgres 23505.
  const open = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "LoyaltyPayoutRequest"
    WHERE "userId" = ${args.userId}
      AND "status" IN ('requested','approved')
    LIMIT 1
  `
  if (open[0]) throw new DuplicateOpenPayoutError()

  const balance = await getWalletBalance(args.userId)
  if (balance.available < args.points) {
    throw new Error(`[payout] insufficient balance: have ${balance.available}, need ${args.points}`)
  }
  const amountMinor = pointsToDiscountMinor(args.points, args.currency)
  if (amountMinor <= 0) {
    throw new Error('[payout] points do not convert to a whole currency unit')
  }

  const wallet = await getOrCreateWallet(args.userId)
  const encrypted = args.bankDetails ? encryptBankDetails(args.bankDetails) : null
  const ledgerId = randomUUID()
  const payoutId = randomUUID()

  // Debit + payout row in one transaction. If either fails the wallet is
  // untouched. The partial UNIQUE may still fire here on a concurrent
  // submission — re-thrown as DuplicateOpenPayoutError.
  try {
    await prisma.$transaction([
      prisma.$executeRaw`
        INSERT INTO "LoyaltyLedgerEntry"
          ("id", "walletId", "type", "points", "reason")
        VALUES
          (${ledgerId}, ${wallet.id}, 'debit', ${args.points},
           'Cheque payout requested · pending approval')
      `,
      prisma.$executeRaw`
        INSERT INTO "LoyaltyPayoutRequest"
          ("id", "walletId", "userId", "points", "amountMinor", "currency",
           "bankDetailsEncrypted", "ledgerEntryId")
        VALUES
          (${payoutId}, ${wallet.id}, ${args.userId}, ${args.points},
           ${amountMinor}, ${args.currency}, ${encrypted}, ${ledgerId})
      `,
    ])
  } catch (e) {
    const msg = (e as Error).message ?? ''
    if (msg.includes('23505') || /unique/i.test(msg)) throw new DuplicateOpenPayoutError()
    throw e
  }
  return { payoutId, ledgerEntryId: ledgerId, amountMinor }
}

// ── Reads ────────────────────────────────────────────────────

export async function listPayoutRequests(
  filter: { status?: PayoutStatus | PayoutStatus[] } = {},
): Promise<PayoutWithUser[]> {
  const statuses = Array.isArray(filter.status)
    ? filter.status
    : filter.status
      ? [filter.status]
      : null

  // Two paths so we don't have to template a dynamic IN list. Both
  // join to IdentityUser for the admin queue display.
  const rows = statuses
    ? await prisma.$queryRaw<PayoutWithUser[]>`
        SELECT pr.*, u."name" AS "userName", u."email" AS "userEmail"
        FROM "LoyaltyPayoutRequest" pr
        JOIN "IdentityUser" u ON u."id" = pr."userId"
        WHERE pr."status" = ANY(${statuses}::text[])
        ORDER BY pr."createdAt" DESC
      `
    : await prisma.$queryRaw<PayoutWithUser[]>`
        SELECT pr.*, u."name" AS "userName", u."email" AS "userEmail"
        FROM "LoyaltyPayoutRequest" pr
        JOIN "IdentityUser" u ON u."id" = pr."userId"
        ORDER BY pr."createdAt" DESC
      `
  return rows
}

export async function getPayoutById(id: string): Promise<PayoutWithUser | null> {
  const rows = await prisma.$queryRaw<PayoutWithUser[]>`
    SELECT pr.*, u."name" AS "userName", u."email" AS "userEmail"
    FROM "LoyaltyPayoutRequest" pr
    JOIN "IdentityUser" u ON u."id" = pr."userId"
    WHERE pr."id" = ${id}
    LIMIT 1
  `
  return rows[0] ?? null
}

export async function getOpenPayoutForUser(userId: string): Promise<PayoutRow | null> {
  const rows = await prisma.$queryRaw<PayoutRow[]>`
    SELECT * FROM "LoyaltyPayoutRequest"
    WHERE "userId" = ${userId} AND "status" IN ('requested','approved')
    ORDER BY "createdAt" DESC
    LIMIT 1
  `
  return rows[0] ?? null
}

/** Admin-only decrypt for rendering bank details inside the queue UI. */
export function revealBankDetails(row: PayoutRow): {
  details: BankDetails
  masked: string
} | null {
  if (!row.bankDetailsEncrypted) return null
  const details = decryptBankDetails(row.bankDetailsEncrypted)
  return { details, masked: maskAccount(details.accountNumber) }
}

// ── State transitions (admin-initiated) ──────────────────────

export async function approvePayout(id: string, adminUserId: string): Promise<void> {
  const updated = await prisma.$executeRaw`
    UPDATE "LoyaltyPayoutRequest"
    SET "status" = 'approved',
        "processedByUserId" = ${adminUserId},
        "processedAt" = NOW(),
        "updatedAt" = NOW()
    WHERE "id" = ${id} AND "status" = 'requested'
  `
  if (updated === 0) throw new Error('[payout] approve: not in requested state')
}

export async function markPaidPayout(
  id: string,
  adminUserId: string,
  notes?: string,
): Promise<void> {
  const updated = await prisma.$executeRaw`
    UPDATE "LoyaltyPayoutRequest"
    SET "status" = 'paid',
        "processedByUserId" = ${adminUserId},
        "processedAt" = NOW(),
        "notes" = COALESCE(${notes ?? null}, "notes"),
        "updatedAt" = NOW()
    WHERE "id" = ${id} AND "status" IN ('requested','approved')
  `
  if (updated === 0) throw new Error('[payout] markPaid: not in requested/approved state')
}

/**
 * Reject + refund. Flips status to 'rejected' AND writes a compensating
 * credit ledger entry in one transaction so the points return to the
 * wallet atomically. Idempotent guard: only refunds rows that were
 * still open at the moment of rejection.
 */
export async function rejectPayout(args: {
  id: string
  adminUserId: string
  reason: string
}): Promise<void> {
  const row = await getPayoutById(args.id)
  if (!row) throw new Error('[payout] not found')
  if (row.status !== 'requested' && row.status !== 'approved') {
    throw new Error(`[payout] cannot reject from status ${row.status}`)
  }
  const compensatingId = randomUUID()
  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE "LoyaltyPayoutRequest"
      SET "status" = 'rejected',
          "processedByUserId" = ${args.adminUserId},
          "processedAt" = NOW(),
          "notes" = ${args.reason},
          "updatedAt" = NOW()
      WHERE "id" = ${args.id} AND "status" IN ('requested','approved')
    `,
    prisma.$executeRaw`
      INSERT INTO "LoyaltyLedgerEntry"
        ("id", "walletId", "type", "points", "reason")
      VALUES
        (${compensatingId}, ${row.walletId}, 'credit', ${row.points},
         ${`Cheque payout rejected — points refunded · ${args.reason}`})
    `,
  ])
}
