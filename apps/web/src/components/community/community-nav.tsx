import { LayoutDashboard, LineChart } from 'lucide-react'
import Link from 'next/link'
import { Logomark, Wordmark } from '../brand/logo'
import { LocaleToggle } from '../locale-toggle'
import { UserChrome } from './user-chrome'

/**
 * Neobrutal top nav for the community surface.
 *
 * ZERO server-side session reads. That's the whole point — pages
 * using this nav can render as anonymous SSG so Googlebot gets a
 * cacheable, indexable response. Session-dependent chrome
 * (notification bell + user menu) lives in the client-side
 * <UserChrome/> which hits /api/me after mount.
 *
 * Lives ONLY on community routes. Lessons + dashboard still use the
 * neutral AppNav until we decide to widen the redesign.
 */

const COPY = {
  en: {
    community: 'Community',
    reels: 'Reels',
    dashboard: 'Dashboard',
    progress: 'Progress',
  },
  ar: {
    community: 'المجتمع',
    reels: 'ريلز',
    dashboard: 'لوحة التحكم',
    progress: 'التقدم',
  },
} as const

export function CommunityNav({ locale }: { locale: 'en' | 'ar' }) {
  const t = COPY[locale]
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <Link
            href={`/${locale}/community`}
            className="group flex shrink-0 items-center gap-2.5"
          >
            <span className="rounded-xl border-2 border-ink bg-white p-1 shadow-pop-xs transition-transform group-hover:-translate-y-0.5">
              <Logomark size={28} />
            </span>
            <Wordmark className="hidden text-base text-ink sm:inline" />
          </Link>

          <Link
            href={`/${locale}/community`}
            className="hidden rounded-full border-2 border-transparent px-3 py-1.5 text-sm font-bold text-ink/70 transition-colors hover:border-ink hover:bg-white hover:text-ink sm:inline-flex"
          >
            {t.community}
          </Link>
          <Link
            href={`/${locale}/reels`}
            className="hidden rounded-full border-2 border-transparent px-3 py-1.5 text-sm font-bold text-ink/70 transition-colors hover:border-ink hover:bg-white hover:text-ink sm:inline-flex"
          >
            {t.reels}
          </Link>
          <Link
            href={`/${locale}/dashboard`}
            className="hidden items-center gap-1.5 rounded-full border-2 border-transparent px-3 py-1.5 text-sm font-bold text-ink/70 transition-colors hover:border-ink hover:bg-white hover:text-ink sm:inline-flex"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            {t.dashboard}
          </Link>
          <Link
            href={`/${locale}/my-progress`}
            className="hidden items-center gap-1.5 rounded-full border-2 border-transparent px-3 py-1.5 text-sm font-bold text-ink/70 transition-colors hover:border-ink hover:bg-white hover:text-ink sm:inline-flex"
          >
            <LineChart className="h-3.5 w-3.5" />
            {t.progress}
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="[&_button]:text-ink [&_span]:text-ink">
            <LocaleToggle locale={locale} />
          </div>
          <UserChrome locale={locale} />
        </div>
      </div>
    </header>
  )
}
