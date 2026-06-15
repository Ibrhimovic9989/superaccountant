/**
 * PayoutService — the cheque/cash redemption rail for SA Points.
 *
 * Mirrors apps/web/src/lib/loyalty/payout-store.ts function-for-function.
 * Both implementations rely on the partial UNIQUE index on (userId)
 * WHERE status IN ('requested','approved') to prevent duplicate open
 * requests under concurrent writes.
 *
 * Per CLAUDE.md §3.4 (DIP, SRP): this is a separate service from
 * LoyaltyService — wallet balance is its own port, cheque payouts are
 * an orthogonal use-case. The two collaborate via LoyaltyService.
 */

import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { prisma } from '@sa/db'
import { type SupportedCurrency, pointsToDiscountMinor } from '../domain/conversion'
import { LoyaltyService } from './loyalty.service'

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

export class DuplicateOpenPayoutError extends Error {
  constructor() {
    super('A cheque payout request is already in flight for this user.')
    this.name = 'DuplicateOpenPayoutError'
  }
}

@Injectable()
export class PayoutService {
  constructor(private readonly loyalty: LoyaltyService) {}

  // ── Request (student-initiated) ──────────────────────────────

  async requestPayout(args: {
    userId: string
    points: number
    currency: SupportedCurrency
    /** Pre-encrypted ciphertext from the web app. The API never sees
     *  plaintext PAN / IFSC. */
    bankDetailsEncrypted?: string
  }): Promise<{ payoutId: string; ledgerEntryId: string; amountMinor: number }> {
    if (args.points <= 0) throw new Error('[payout] points must be > 0')

    const open = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "LoyaltyPayoutRequest"
      WHERE "userId" = ${args.userId}
        AND "status" IN ('requested','approved')
      LIMIT 1
    `
    if (open[0]) throw new DuplicateOpenPayoutError()

    const balance = await this.loyalty.getBalance(args.userId)
    if (balance.available < args.points) {
      throw new Error(
        `[payout] insufficient balance: have ${balance.available}, need ${args.points}`,
      )
    }
    const amountMinor = pointsToDiscountMinor(args.points, args.currency)
    if (amountMinor <= 0) {
      throw new Error('[payout] points do not convert to a whole currency unit')
    }

    const wallet = await this.loyalty.getOrCreateWallet(args.userId)
    const ledgerId = randomUUID()
    const payoutId = randomUUID()

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
             ${amountMinor}, ${args.currency},
             ${args.bankDetailsEncrypted ?? null}, ${ledgerId})
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

  async listPayoutRequests(status?: PayoutStatus | PayoutStatus[]): Promise<PayoutRow[]> {
    const statuses = Array.isArray(status) ? status : status ? [status] : null
    if (statuses) {
      return prisma.$queryRaw<PayoutRow[]>`
        SELECT * FROM "LoyaltyPayoutRequest"
        WHERE "status" = ANY(${statuses}::text[])
        ORDER BY "createdAt" DESC
      `
    }
    return prisma.$queryRaw<PayoutRow[]>`
      SELECT * FROM "LoyaltyPayoutRequest"
      ORDER BY "createdAt" DESC
    `
  }

  async getById(id: string): Promise<PayoutRow | null> {
    const rows = await prisma.$queryRaw<PayoutRow[]>`
      SELECT * FROM "LoyaltyPayoutRequest" WHERE "id" = ${id} LIMIT 1
    `
    return rows[0] ?? null
  }

  // ── State transitions (admin-initiated) ──────────────────────

  async approvePayout(id: string, adminUserId: string): Promise<void> {
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

  async markPaidPayout(id: string, adminUserId: string, notes?: string): Promise<void> {
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

  async rejectPayout(args: {
    id: string
    adminUserId: string
    reason: string
  }): Promise<void> {
    const row = await this.getById(args.id)
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
}
