/**
 * LoyaltyService — the single application-layer entry point for the SA
 * Points / SA Wallet system. Other bounded contexts (learning,
 * assessment, identity/referral) call into this service when they
 * detect a milestone; the cohort checkout flow calls it to preview and
 * commit redemptions.
 *
 * Tables are persisted as raw SQL (see add-loyalty-tables.mjs) and not
 * declared in schema.prisma, matching the pattern in
 * apps/web/src/lib/cohort/store.ts.
 *
 * Per CLAUDE.md §3.4 (DIP): this service is the port other contexts
 * depend on. Internally it uses Prisma directly — that's fine because
 * loyalty IS the implementation of the loyalty port.
 */

import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { prisma } from '@sa/db'
import { MILESTONES, type MilestoneType } from '../domain/milestones'
import { planRedemption, type SupportedCurrency } from '../domain/conversion'
import type { LedgerEntry, WalletBalance, WalletHistoryItem } from '../domain/types'

/** SA points expire 12 months after the credit posts (locked policy). */
const POINT_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000

@Injectable()
export class LoyaltyService {
  // ── Wallet creation + balance ───────────────────────────────

  /**
   * Returns the user's wallet, creating one lazily on first access.
   * Idempotent — safe to call from anywhere.
   */
  async getOrCreateWallet(userId: string): Promise<{ id: string; userId: string }> {
    const existing = await prisma.$queryRaw<Array<{ id: string; userId: string }>>`
      SELECT "id", "userId" FROM "LoyaltyWallet" WHERE "userId" = ${userId} LIMIT 1
    `
    if (existing[0]) return existing[0]

    const id = randomUUID()
    await prisma.$executeRaw`
      INSERT INTO "LoyaltyWallet" ("id", "userId") VALUES (${id}, ${userId})
      ON CONFLICT ("userId") DO NOTHING
    `
    // Re-read to handle the race where another request created the row
    // between our SELECT and INSERT.
    const row = await prisma.$queryRaw<Array<{ id: string; userId: string }>>`
      SELECT "id", "userId" FROM "LoyaltyWallet" WHERE "userId" = ${userId} LIMIT 1
    `
    if (!row[0]) throw new Error('[loyalty] failed to create wallet')
    return row[0]
  }

  /**
   * Compute available + lifetime balances by summing the ledger.
   * Available counts credits whose expiresAt is in the future, minus
   * debits, minus already-recorded expiries.
   */
  async getBalance(userId: string): Promise<WalletBalance> {
    const wallet = await this.getOrCreateWallet(userId)
    const rows = await prisma.$queryRaw<
      Array<{ type: 'credit' | 'debit' | 'expiry'; points: number; expiresAt: Date | null }>
    >`
      SELECT "type", "points", "expiresAt"
      FROM "LoyaltyLedgerEntry"
      WHERE "walletId" = ${wallet.id}
    `

    const now = Date.now()
    let credits = 0
    let debits = 0
    let expiries = 0
    let expiredButUnswept = 0
    let lifetimeEarned = 0

    for (const r of rows) {
      if (r.type === 'credit') {
        lifetimeEarned += r.points
        const isExpired = r.expiresAt !== null && r.expiresAt.getTime() <= now
        if (isExpired) {
          expiredButUnswept += r.points
        } else {
          credits += r.points
        }
      } else if (r.type === 'debit') {
        debits += r.points
      } else {
        expiries += r.points
      }
    }

    // The expiry sweep cron will eventually convert expiredButUnswept into
    // recorded 'expiry' entries. Until then, subtract it from available so
    // the user can never spend points that have already lapsed.
    const available = Math.max(0, credits - debits - expiries)
    return {
      available,
      pendingExpiry: expiredButUnswept,
      lifetimeEarned,
    }
  }

  // ── History ─────────────────────────────────────────────────

  async getHistory(userId: string, limit = 50): Promise<WalletHistoryItem[]> {
    const wallet = await this.getOrCreateWallet(userId)
    const rows = await prisma.$queryRaw<LedgerEntry[]>`
      SELECT "id", "walletId", "type", "points", "reason", "milestoneKey",
             "cohortApplicationId", "expiresAt", "metadata", "createdAt"
      FROM "LoyaltyLedgerEntry"
      WHERE "walletId" = ${wallet.id}
      ORDER BY "createdAt" ASC
    `
    // Fold chronologically forward to compute running balance, then
    // reverse for display (most recent first) and trim to `limit`.
    let running = 0
    const folded: WalletHistoryItem[] = []
    for (const r of rows) {
      const delta = r.type === 'credit' ? r.points : -r.points
      running += delta
      folded.push({ ...r, balanceAfter: running })
    }
    return folded.reverse().slice(0, limit)
  }

  // ── Milestone credit (idempotent) ───────────────────────────

  /**
   * Credit a milestone reward. The (userId, milestoneKey) UNIQUE index
   * makes this idempotent — calling twice with the same context is a
   * no-op on the second call.
   *
   * Returns the ledger entry id on a real credit, or `null` if the
   * milestone was already recorded.
   */
  async creditMilestone(args: {
    userId: string
    milestoneType: MilestoneType
    /** Per-instance context: phaseId, referredUserId, etc. See MILESTONES. */
    context?: Record<string, string>
  }): Promise<{ ledgerEntryId: string; pointsAwarded: number } | null> {
    const milestone = MILESTONES[args.milestoneType]
    if (!milestone) throw new Error(`[loyalty] unknown milestone ${args.milestoneType}`)
    const ctx = args.context ?? {}
    const milestoneKey = milestone.buildKey(ctx)
    const reason = milestone.reason(ctx)

    const wallet = await this.getOrCreateWallet(args.userId)
    const expiresAt = new Date(Date.now() + POINT_EXPIRY_MS)
    const ledgerId = randomUUID()
    const achievementId = randomUUID()

    // Both writes in one transaction so a partial credit can't happen.
    try {
      await prisma.$transaction([
        prisma.$executeRaw`
          INSERT INTO "LoyaltyMilestoneAchievement"
            ("id", "userId", "milestoneKey", "pointsAwarded", "ledgerEntryId")
          VALUES
            (${achievementId}, ${args.userId}, ${milestoneKey}, ${milestone.points}, ${ledgerId})
        `,
        prisma.$executeRaw`
          INSERT INTO "LoyaltyLedgerEntry"
            ("id", "walletId", "type", "points", "reason", "milestoneKey", "expiresAt")
          VALUES
            (${ledgerId}, ${wallet.id}, 'credit', ${milestone.points}, ${reason}, ${milestoneKey}, ${expiresAt})
        `,
      ])
      return { ledgerEntryId: ledgerId, pointsAwarded: milestone.points }
    } catch (e) {
      // 23505 = unique_violation → milestone already credited. That's
      // expected and not an error from the caller's perspective.
      const msg = (e as Error).message ?? ''
      if (msg.includes('23505') || /unique/i.test(msg)) return null
      throw e
    }
  }

  // ── Redemption (preview + commit) ───────────────────────────

  /**
   * Preview how many points to debit and the resulting discount in
   * minor units, given the user's wallet balance and the order total.
   * Pure read — never writes.
   *
   * Used by the cohort apply UI to show "Save up to ₹X with SA Cash"
   * and by the order-creation server action to set the order amount.
   */
  async planRedemption(args: {
    userId: string
    requestedPoints: number
    orderTotalMinor: number
    currency: SupportedCurrency
  }): Promise<{ pointsToDebit: number; discountMinor: number; walletBalance: number }> {
    const balance = await this.getBalance(args.userId)
    const plan = planRedemption({
      requestedPoints: args.requestedPoints,
      walletBalance: balance.available,
      orderTotalMinor: args.orderTotalMinor,
      currency: args.currency,
    })
    return { ...plan, walletBalance: balance.available }
  }

  /**
   * Commit a redemption by writing a debit ledger entry. Called from
   * the Razorpay webhook on `payment.captured` after the user's order
   * is confirmed.
   *
   * Idempotent on `cohortApplicationId`: a partial unique index in the
   * DB enforces at most one debit row per application, so a webhook
   * retry can never double-debit. If a debit already exists for this
   * application we return its id instead of erroring.
   */
  async commitRedemption(args: {
    userId: string
    points: number
    cohortApplicationId: string
    reason?: string
  }): Promise<{ ledgerEntryId: string; alreadyDebited: boolean }> {
    if (args.points <= 0) throw new Error('[loyalty] points must be > 0')

    // Idempotency check: existing debit for this application?
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "LoyaltyLedgerEntry"
      WHERE "cohortApplicationId" = ${args.cohortApplicationId}
        AND "type" = 'debit'
      LIMIT 1
    `
    if (existing[0]) {
      return { ledgerEntryId: existing[0].id, alreadyDebited: true }
    }

    const balance = await this.getBalance(args.userId)
    if (balance.available < args.points) {
      throw new Error(
        `[loyalty] insufficient balance: have ${balance.available}, need ${args.points}`,
      )
    }
    const wallet = await this.getOrCreateWallet(args.userId)
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
      // The partial UNIQUE index raised 23505 — concurrent webhook delivery
      // raced us. Re-read and return the winner's id.
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
}
