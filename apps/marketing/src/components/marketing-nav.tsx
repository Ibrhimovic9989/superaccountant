'use client'

import * as React from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
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
    open: 'Open menu',
    close: 'Close menu',
  },
  ar: {
    pricing: 'الأسعار',
    features: 'الميزات',
    about: 'من نحن',
    signIn: 'تسجيل الدخول',
    getStarted: 'ابدأ الآن',
    open: 'فتح القائمة',
    close: 'إغلاق القائمة',
  },
} as const

export function MarketingNav({ locale }: Props) {
  const t = COPY[locale]
  const [open, setOpen] = React.useState(false)

  // Lock body scroll when the mobile menu is open.
  React.useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  // Close on Escape.
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const links = [
    { label: t.features, href: `/${locale}/features` },
    { label: t.pricing, href: `/${locale}/pricing` },
    { label: t.about, href: `/${locale}/about` },
  ]

  return (
    <header className="relative z-30 flex h-14 items-center justify-between gap-2 px-4 sm:px-6">
      <Link href={`/${locale}`} className="group flex items-center gap-2.5">
        <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-md bg-fg text-bg">
          <span className="font-mono text-[11px] font-bold leading-none">SA</span>
        </span>
        <span className="text-sm font-semibold tracking-tight">SuperAccountant</span>
      </Link>

      {/* Desktop links */}
      <nav className="hidden items-center gap-1 md:flex">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-md px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-elev hover:text-fg"
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {/* Right cluster — desktop */}
      <div className="hidden items-center gap-2 md:flex">
        <LocaleToggle locale={locale} />
        <ThemeToggle />
        <Button asChild variant="ghost" size="sm" className="ms-2">
          <a href={appLink(locale, '/sign-in')}>{t.signIn}</a>
        </Button>
        <Button asChild variant="accent" size="sm">
          <a href={appLink(locale, '/sign-in')}>{t.getStarted}</a>
        </Button>
      </div>

      {/* Right cluster — mobile (only Get started + hamburger) */}
      <div className="flex items-center gap-2 md:hidden">
        <Button asChild variant="accent" size="sm">
          <a href={appLink(locale, '/sign-in')}>{t.getStarted}</a>
        </Button>
        <button
          type="button"
          aria-label={open ? t.close : t.open}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-bg-elev text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile slide-down sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-2 top-14 z-40 origin-top overflow-hidden rounded-2xl border border-border bg-bg-elev/95 shadow-2xl shadow-black/40 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col p-2">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-base font-medium text-fg transition-colors hover:bg-bg-overlay"
                >
                  {l.label}
                </Link>
              ))}
              <a
                href={appLink(locale, '/sign-in')}
                className="rounded-xl px-4 py-3 text-base font-medium text-fg-muted transition-colors hover:bg-bg-overlay"
              >
                {t.signIn}
              </a>
              <div className="mt-2 flex items-center justify-between border-t border-border px-2 pt-3">
                <LocaleToggle locale={locale} />
                <ThemeToggle />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
