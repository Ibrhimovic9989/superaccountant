import { ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'

/**
 * Anon-only CTA card, mixed into the public feed at ~position 3.
 * Prospects who land here from Google, Instagram, or a shared post
 * see this once between real posts — soft nudge to the entry-test
 * funnel without disrupting the community vibe.
 *
 * NEVER rendered for signed-in users. The feed page decides.
 */

export function AnonCtaCard({ locale }: { locale: 'en' | 'ar' }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-br from-accent-soft via-bg-elev to-warning/20 p-6 sm:p-8">
      {/* subtle sparkle badge */}
      <div className="absolute -end-6 -top-6 hidden h-24 w-24 rotate-12 rounded-3xl bg-accent/10 blur-2xl sm:block" />
      <div className="relative">
        <p className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
          <Sparkles className="h-3 w-3" />
          Start here
        </p>
        <h3 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
          These wins didn&apos;t happen by accident.
        </h3>
        <p className="mt-1 max-w-md text-sm text-fg-muted">
          Every post above is from a real SuperAccountant student. Take a 60-second
          placement test to see where you&apos;d start — and the daily agent
          takes it from there.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/quiz`}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            Take the placement test
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/${locale}/pricing`}
            className="text-xs font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline"
          >
            Or see cohort pricing
          </Link>
        </div>
      </div>
    </div>
  )
}
