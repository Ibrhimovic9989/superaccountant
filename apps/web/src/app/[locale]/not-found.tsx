'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

const COPY = {
  en: {
    eyebrow: '404',
    title: 'This page got lost in the ledger.',
    body: "We couldn't find what you were looking for. Either the link is wrong, or the page has moved.",
    cta: 'Back to dashboard',
  },
  ar: {
    eyebrow: '٤٠٤',
    title: 'هذه الصفحة ضاعت في الدفتر.',
    body: 'لم نتمكن من العثور على ما كنت تبحث عنه. إما أن الرابط خاطئ، أو أن الصفحة قد انتقلت.',
    cta: 'العودة إلى لوحة التحكم',
  },
} as const

export default function NotFound() {
  const path = usePathname()
  const locale: 'en' | 'ar' = path?.startsWith('/ar') ? 'ar' : 'en'
  const t = COPY[locale]
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center text-fg">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg-elev">
        <Compass className="h-6 w-6 text-accent" />
      </div>
      <p className="mt-8 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        {t.eyebrow}
      </p>
      <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
        {t.title}
      </h1>
      <p className="mt-4 max-w-md text-sm text-fg-muted">{t.body}</p>
      <Button asChild variant="accent" size="lg" className="mt-8">
        <Link href={`/${locale}/dashboard`}>
          {t.cta}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </Button>
    </div>
  )
}
