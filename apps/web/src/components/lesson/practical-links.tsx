import type { GuideStub } from '@/lib/data/lessons'
import type { SupportedLocale } from '@sa/i18n'
import { ArrowRight, Wrench } from 'lucide-react'
import Link from 'next/link'

/**
 * Theory <-> practice bridge. Renders below the lesson body whenever
 * the lesson has `relatedGuideSlugs` populated. Each card jumps to the
 * matching interactive walkthrough on the Guides surface.
 *
 * Server-rendered: zero client JS, slugs are resolved upstream via
 * `getGuideStubsBySlug` so we never ship the whole GUIDES registry to
 * the browser.
 */

type Family = 'tally-prime' | 'zoho-books' | 'quickbooks-online' | 'other'

const COPY = {
  en: {
    heading: 'See this in practice',
    sub: 'Take what you just learned and try it in real accounting software.',
    cta: 'Open guide',
  },
  ar: {
    heading: 'شاهد هذا عمليًا',
    sub: 'طبّق ما تعلمته للتو في برنامج محاسبة حقيقي.',
    cta: 'افتح الدليل',
  },
} as const

const FAMILY_BADGE: Record<Family, { label: string; classes: string }> = {
  'tally-prime': {
    label: 'Tally Prime',
    classes: 'border-warning/30 bg-warning/10 text-warning',
  },
  'zoho-books': {
    label: 'Zoho Books',
    classes: 'border-accent/30 bg-accent-soft text-accent',
  },
  'quickbooks-online': {
    label: 'QuickBooks',
    classes: 'border-success/30 bg-success/10 text-success',
  },
  other: {
    label: 'Tool',
    classes: 'border-border bg-bg-elev text-fg-muted',
  },
}

export function PracticalLinks({
  locale,
  guides,
}: {
  locale: SupportedLocale
  guides: GuideStub[]
}) {
  if (guides.length === 0) return null
  const t = COPY[locale]

  return (
    <section className="mx-auto mt-2 max-w-5xl px-4 pb-16 sm:px-6">
      <div className="rounded-2xl border border-border bg-bg-elev/50 p-5 backdrop-blur sm:p-7">
        <div className="mb-5 flex items-start gap-3">
          <span
            aria-hidden
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft text-accent"
          >
            <Wrench className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-fg">{t.heading}</h2>
            <p className="mt-0.5 text-sm text-fg-muted">{t.sub}</p>
          </div>
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {guides.map((g) => {
            const badge = FAMILY_BADGE[g.family]
            return (
              <li key={g.slug}>
                <Link
                  href={`/${locale}/guides/${g.slug}`}
                  className="group flex h-full items-center gap-3 rounded-xl border border-border bg-bg p-4 transition-colors hover:border-border-strong hover:bg-bg-elev"
                >
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-bg-elev text-lg"
                  >
                    {g.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${badge.classes}`}
                    >
                      {badge.label}
                    </span>
                    <span className="mt-1 block truncate text-sm font-medium text-fg">
                      {g.title}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                  />
                  <span className="sr-only">{t.cta}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
