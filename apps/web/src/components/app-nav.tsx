import Link from 'next/link'
import { Command, LayoutDashboard, Map, Search } from 'lucide-react'
import { Logomark, Wordmark } from './brand/logo'
import { ThemeToggle } from './theme-toggle'
import { LocaleToggle } from './locale-toggle'
import { UserMenu } from './user-menu'

type Props = {
  locale: 'en' | 'ar'
  userName: string | null
  userEmail: string
}

const COPY = {
  en: { dashboard: 'Dashboard', roadmap: 'Roadmap', search: 'Search' },
  ar: { dashboard: 'لوحة التحكم', roadmap: 'خريطة الطريق', search: 'بحث' },
} as const

/**
 * App-wide top nav. Sits above the dashboard, lesson, and admin pages.
 * Brand mark on the left, theme toggle + cmd+k hint + avatar on the right.
 */
export function AppNav({ locale, userName, userEmail }: Props) {
  const t = COPY[locale]
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <Link href={`/${locale}/dashboard`} className="group flex shrink-0 items-center gap-2.5">
            <Logomark size={36} />
            <Wordmark className="text-base max-[420px]:hidden" />
          </Link>

          <Link
            href={`/${locale}/dashboard`}
            className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-elev hover:text-fg sm:inline-flex"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            {t.dashboard}
          </Link>
          <Link
            href={`/${locale}/roadmap`}
            className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-elev hover:text-fg sm:inline-flex"
          >
            <Map className="h-3.5 w-3.5" />
            {t.roadmap}
          </Link>
          <Link
            href={`/${locale}/search`}
            className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-elev hover:text-fg sm:inline-flex"
          >
            <Search className="h-3.5 w-3.5" />
            {t.search}
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            className="hidden h-8 items-center gap-1.5 rounded-md border border-border bg-bg-elev px-2.5 font-mono text-[11px] text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg sm:inline-flex"
          >
            <Command className="h-3 w-3" />
            <span>K</span>
          </button>
          <LocaleToggle locale={locale} />
          <ThemeToggle />
          <UserMenu locale={locale} userName={userName} userEmail={userEmail} />
        </div>
      </div>
    </header>
  )
}
