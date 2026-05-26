import { Wallet } from 'lucide-react'
import { NumberTicker } from '@/components/magicui/number-ticker'

/**
 * SA Cash wallet tile. Server-rendered with the user's current
 * available balance, shown alongside the other dashboard stat tiles.
 *
 * Displays:
 *   - Available balance (the spendable number)
 *   - Lifetime earned (so the tile feels rewarding even when balance=0)
 *   - Quick description of the conversion rate
 *
 * Hides itself entirely if the wallet has never been credited, to
 * avoid showing "0 SA points" to fresh enrollees who haven't completed
 * a phase yet.
 */
export function WalletTile({
  available,
  lifetimeEarned,
}: {
  available: number
  lifetimeEarned: number
}) {
  if (lifetimeEarned === 0) return null

  return (
    <div className="relative overflow-hidden rounded-2xl border border-success/30 bg-success/10 p-5">
      <div className="mb-2 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-success" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          SA Wallet
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <NumberTicker
          value={available}
          className="font-mono text-3xl font-semibold tracking-tight text-fg sm:text-4xl"
        />
        <span className="text-sm text-fg-muted">SA</span>
      </div>
      <p className="mt-1 text-xs text-fg-muted">
        {available > 0
          ? `Worth ₹${available.toLocaleString()} off your next cohort`
          : 'Earn more by completing phases & inviting friends'}
      </p>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        Lifetime · {lifetimeEarned.toLocaleString()} SA earned
      </p>
    </div>
  )
}
