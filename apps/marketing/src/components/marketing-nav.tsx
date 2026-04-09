import Link from 'next/link'
import { ThemeToggle } from './theme-toggle'
import { LocaleToggle } from './locale-toggle'
import { Button } from './ui/button'
import { appLink } from '@/lib/config'

type Props = {
  locale: 'en' | 'ar'
}

const COPY = {
  en: {
    pricing: 'Pricing',
    features: 'Features',
    about: 'About',
    signIn: 'Sign in',
    getStarted: 'Get started',
  },
  ar: {
    pricing: 'الأسعار',
    features: 'الميزات',
    about: 'من نحن',
    signIn: 'تسجيل الدخول',
    getStarted: 'ابدأ الآن',
  },
} as const

export function MarketingNav({ locale }: Props) {
  const t = COPY[locale]
  return (
    <header className="relative z-10 flex h-14 items-center justify-between px-6">
      <Link href={`/${locale}`} className="group flex items-center gap-2.5">
        <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-md bg-fg text-bg">
          <span className="font-mono text-[11px] font-bold leading-none">SA</span>
        </span>
        <span className="text-sm font-semibold tracking-tight">SuperAccountant</span>
      </Link>

      <nav className="hidden items-center gap-1 md:flex">
        <Link
          href={`/${locale}/features`}
          className="rounded-md px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-elev hover:text-fg"
        >
          {t.features}
        </Link>
        <Link
          href={`/${locale}/pricing`}
          className="rounded-md px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-elev hover:text-fg"
        >
          {t.pricing}
        </Link>
        <Link
          href={`/${locale}/about`}
          className="rounded-md px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-elev hover:text-fg"
        >
          {t.about}
        </Link>
      </nav>

      <div className="flex items-center gap-2">
        <LocaleToggle locale={locale} />
        <ThemeToggle />
        <Button asChild variant="ghost" size="sm" className="ms-2 hidden sm:inline-flex">
          <a href={appLink(locale, '/sign-in')}>{t.signIn}</a>
        </Button>
        <Button asChild variant="accent" size="sm">
          <a href={appLink(locale, '/sign-in')}>{t.getStarted}</a>
        </Button>
      </div>
    </header>
  )
}
