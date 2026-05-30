import { ArrowRight, Wallet } from 'lucide-react'
import Link from 'next/link'
import type { SupportedLocale } from '@sa/i18n'
import { NumberTicker } from '@/components/magicui/number-ticker'

/**
 * SA Cash wallet tile on the dashboard.
 *
 * Always renders — even at 0 — so fresh enrollees discover that the
 * loyalty programme exists. Copy adapts:
 *   • 0 SA earned → "Earn your first 200 SA by completing a phase…"
 *   • > 0 earned   → live balance + lifetime + redeem hint
 *
 * Every tile links to /rewards for the full catalog.
 */
export function WalletTile({
  locale,
  available,
  lifetimeEarned,
}: {
  locale: SupportedLocale
  available: number
  lifetimeEarned: number
}) {
  const isFresh = lifetimeEarned === 0
  return (
    <Link
      href={`/${locale}/rewards`}
      className="group relative block overflow-hidden rounded-2xl border border-success/30 bg-success/10 p-5 transition-colors hover:border-success/50"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          <Wallet className="h-4 w-4 text-success" />
          SA Wallet
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-fg-subtle transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
      </div>

      {isFresh ? (
        <>
          <p className="text-lg font-semibold tracking-tight text-fg">
            Earn SA Points as you learn
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            +200 SA per phase · +1,000 SA on grand test · +1,000 SA per referral. Redeem up to 100%
            on your next cohort.
          </p>
        </>
      ) : (
        <>
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
        </>
      )}
    </Link>
  )
}
