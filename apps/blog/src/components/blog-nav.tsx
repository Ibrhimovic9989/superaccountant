'use client'

import * as React from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Logomark, Wordmark } from './brand/logo'
import { ThemeToggle } from './theme-toggle'

/**
 * Blog top nav — visual sibling of apps/marketing's MarketingNav.
 * Logomark + Wordmark on the left, content links + theme toggle + CTAs
 * on the right. Same 16-tall header, same hover-pill links, same
 * accent "Join cohort" CTA so the brand reads continuously across
 * blog → marketing → app.
 *
 * No locale switch (the blog is EN-only for now). No motion lib — the
 * mobile sheet drops in via a CSS data attribute transition to keep
 * the bundle smaller than the marketing nav.
 */

type Props = {
  appUrl: string
}

export function BlogNav({ appUrl }: Props) {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const links = [
    { label: 'Latest', href: '/' },
    { label: 'India', href: '/tag/india' },
    { label: 'KSA', href: '/tag/ksa' },
    { label: 'Careers', href: '/tag/careers' },
  ]

  return (
    <header className="relative z-30 flex h-16 items-center justify-between gap-2 px-4 sm:px-6">
      <Link href="/" className="group flex items-center gap-2.5">
        <Logomark size={36} />
        <Wordmark className="text-base" />
        <span className="ms-1 hidden text-xs font-medium uppercase tracking-wider text-fg-subtle sm:inline">
          Journal
        </span>
      </Link>

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

      <div className="hidden items-center gap-2 md:flex">
        <ThemeToggle />
        <a
          href={`${appUrl}/en/quiz`}
          className="rounded-md px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-elev hover:text-fg"
        >
          Take the quiz
        </a>
        <a
          href={`${appUrl}/en/cohort`}
          className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
        >
          Join cohort
        </a>
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <a
          href={`${appUrl}/en/cohort`}
          className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          Cohort
        </a>
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-bg-elev text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-2 top-14 z-40 origin-top overflow-hidden rounded-2xl border border-border bg-bg-elev/95 shadow-2xl shadow-black/40 backdrop-blur-xl md:hidden">
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
              href={`${appUrl}/en/quiz`}
              className="rounded-xl px-4 py-3 text-base font-medium text-fg-muted transition-colors hover:bg-bg-overlay"
            >
              Take the quiz
            </a>
            <div className="mt-2 flex items-center justify-between border-t border-border px-2 pt-3">
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
