import Link from 'next/link'
import { Command, LayoutDashboard, Map } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { LocaleToggle } from './locale-toggle'
import { UserMenu } from './user-menu'

type Props = {
  locale: 'en' | 'ar'
  userName: string | null
  userEmail: string
}

const COPY = {
  en: { dashboard: 'Dashboard', roadmap: 'Roadmap' },
  ar: { dashboard: 'لوحة التحكم', roadmap: 'خريطة الطريق' },
} as const

/**
 * App-wide top nav. Sits above the dashboard, lesson, and admin pages.
 * Brand mark on the left, theme toggle + cmd+k hint + avatar on the right.
 */
export function AppNav({ locale, userName, userEmail }: Props) {
  const t = COPY[locale]
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <Link href={`/${locale}/dashboard`} className="group flex shrink-0 items-center gap-2">
            <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-fg text-bg">
              <span className="font-mono text-[11px] font-bold leading-none">SA</span>
            </span>
            <span className="text-sm font-semibold tracking-tight max-[420px]:hidden">SuperAccountant</span>
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
