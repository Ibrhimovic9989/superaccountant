import type { ReactNode } from 'react'
import { CircleDot } from 'lucide-react'
import { MarketingNav } from '@/components/marketing-nav'
import { Footer } from '@/components/footer'
import { DotPattern } from '@/components/magicui/dot-pattern'
import { BlurFade } from '@/components/magicui/blur-fade'

type Props = {
  locale: 'en' | 'ar'
  eyebrow: string
  title: string
  lastUpdated: string
  children: ReactNode
}

/**
 * Shared layout for legal pages — terms, privacy, etc.
 * Renders a centered article column with the marketing chrome.
 */
export function LegalDoc({ locale, eyebrow, title, lastUpdated, children }: Props) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-bg text-fg">
      <DotPattern
        glow
        className="[mask-image:radial-gradient(ellipse_at_top,white,transparent_60%)] text-fg-subtle/40"
      />
      <MarketingNav locale={locale} />

      <main className="relative z-10 mx-auto max-w-3xl px-6 pt-20 pb-24">
        <BlurFade delay={0.05}>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev/80 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted backdrop-blur">
            <CircleDot className="h-3 w-3 text-accent" />
            {eyebrow}
          </div>
        </BlurFade>
        <BlurFade delay={0.1}>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        </BlurFade>
        <BlurFade delay={0.15}>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {locale === 'ar' ? 'آخر تحديث' : 'Last updated'} · {lastUpdated}
          </p>
        </BlurFade>

        <BlurFade delay={0.2}>
          <article className="prose mt-12 max-w-none">{children}</article>
        </BlurFade>
      </main>

      <Footer locale={locale} />
    </div>
  )
}
