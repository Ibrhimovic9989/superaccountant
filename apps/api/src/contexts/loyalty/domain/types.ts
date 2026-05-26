/**
 * Domain types for the loyalty (SA Points) context.
 * Per CLAUDE.md §3.4 (LSP): repos return these, not Prisma models.
 */

export type LedgerEntryType = 'credit' | 'debit' | 'expiry'

export type LedgerEntry = {
  id: string
  walletId: string
  type: LedgerEntryType
  points: number
  reason: string
  milestoneKey: string | null
  cohortApplicationId: string | null
  /** Set ONLY on credits — 12 months from createdAt. */
  expiresAt: Date | null
  metadata: Record<string, unknown> | null
  createdAt: Date
}

export type WalletBalance = {
  /** Net spendable balance (credits − debits − expiries), considering
   *  ONLY credits whose expiresAt is in the future. */
  available: number
  /** Sum of credits that have expired but not yet been written off via
   *  the cron sweep. Informational. */
  pendingExpiry: number
  /** All-time gross credits, including expired. Useful for "you've earned
   *  X SA points lifetime" UI. */
  lifetimeEarned: number
}

export type WalletHistoryItem = LedgerEntry & {
  /** Running balance immediately after this entry. Filled by the service
   *  on read so the UI doesn't have to recompute. */
  balanceAfter: number
}
