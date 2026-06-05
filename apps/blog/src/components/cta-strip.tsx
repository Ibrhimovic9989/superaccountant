import { ArrowRight } from 'lucide-react'
import type { BlogMarket } from '@/lib/blog/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.superaccountant.in'

/**
 * Conversion strip used at the bottom of the home page and the end of
 * articles. Copy adapts to the post's market: India posts push the
 * 45-day cohort, KSA posts push the ZATCA track preview.
 *
 * TODO(ibrahim): the cohort price is currently hardcoded to a generic
 * label — when we lock the per-cohort price source we should pull it
 * from the live cohort row rather than baking ₹24,999 into the copy.
 */
export function CtaStrip({ market = 'global' }: { market?: BlogMarket }) {
  const isKsa = market === 'ksa'
  const headline = isKsa
    ? 'Ready to put this into practice? Get the SuperAccountant KSA cohort.'
    : 'Ready to put this into practice? Join the 45-day cohort.'
  const sub = isKsa
    ? 'Hands-on ZATCA, VAT, Zakat, and IFRS. Daily AI assignments, weekly review.'
    : 'Hands-on GST, TDS, Ind AS, and Companies Act. Daily AI assignments, weekly review.'

  return (
    <aside className="rounded-2xl border border-accent/40 bg-accent-soft p-6 sm:p-8">
      <p className="font-mono text-[11px] uppercase tracking-wider text-accent">Next step</p>
      <h2 className="mt-2 text-2xl font-semibold leading-tight">{headline}</h2>
      <p className="mt-2 text-sm text-fg-muted">{sub}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={`${APP_URL}/cohort`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          Join the cohort
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
        <a
          href={`${APP_URL}/quiz`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-bg px-4 py-2.5 text-sm font-medium hover:border-border-strong"
        >
          Take the 5-min quiz
        </a>
      </div>
    </aside>
  )
}
