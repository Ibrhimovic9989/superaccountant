'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Sticker } from './su/primitives'
import { useViewerState } from './viewer-state'

/**
 * Anon-only CTA card, slotted into the public feed at position 3.
 * Prospects who land here from Google / Instagram / a shared post
 * see this once between real posts — soft nudge into the entry-test
 * funnel without disrupting the community vibe.
 *
 * Now client-side because the parent page is anonymous SSG — we
 * can't gate visibility on server-known auth state anymore. Reads
 * ViewerStateContext and hides itself once the hydration fetch
 * confirms the viewer IS signed in.
 *
 * Before hydration: always renders. Signed-in users see it for
 * ~200ms then it disappears. Anonymous users see it and it stays.
 * Googlebot sees it and can index the copy + link.
 */

export function AnonCtaCard({ locale }: { locale: 'en' | 'ar' }) {
  const viewer = useViewerState()

  // Once we know the viewer is signed in, get out of the way. Before
  // hydration `signedIn` is null → we render (default anon state).
  if (viewer.signedIn === true) return null

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-ink bg-butter p-6 shadow-pop-md sm:p-8">
      {/* Sticker in the top-right */}
      <div className="pointer-events-none absolute end-4 top-4">
        <Sticker tone="coral" rotate="6deg">
          ✨ Start here
        </Sticker>
      </div>

      <div className="pe-24">
        <h3 className="font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
          These wins didn&apos;t happen by accident.
        </h3>
        <p className="mt-2 max-w-md text-sm font-medium text-ink/70">
          Every post above is from a real SuperAccountant student.
          Take a 60-second placement test to see where you&apos;d
          start — and the daily agent takes it from there.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/quiz`}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-ink px-5 py-2.5 text-sm font-bold text-cream shadow-pop-sm transition-all hover:-translate-y-0.5 hover:shadow-pop-md active:translate-y-[2px] active:shadow-pop-xs"
          >
            Take the placement test
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/${locale}/pricing`}
            className="text-xs font-bold text-ink/70 underline decoration-2 underline-offset-4 hover:text-ink"
          >
            Or see cohort pricing
          </Link>
        </div>
      </div>
    </div>
  )
}
