'use client'

import { DotPattern } from '@/components/magicui/dot-pattern'
import { Button } from '@/components/ui/button'
import { captureException } from '@/lib/observability'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { usePathname } from 'next/navigation'
import * as React from 'react'

const COPY = {
  en: {
    eyebrow: 'Something broke',
    title: "That didn't work.",
    body: 'An unexpected error happened while loading this page. You can try again, or head back to the home page.',
    retry: 'Try again',
    home: 'Go home',
    digest: 'Error reference',
  },
  ar: {
    eyebrow: 'حدث خطأ',
    title: 'لم ينجح ذلك.',
    body: 'حدث خطأ غير متوقع أثناء تحميل هذه الصفحة. يمكنك المحاولة مرة أخرى، أو العودة إلى الصفحة الرئيسية.',
    retry: 'حاول مرة أخرى',
    home: 'الصفحة الرئيسية',
    digest: 'رمز الخطأ',
  },
} as const

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const path = usePathname()
  const locale: 'en' | 'ar' = path?.startsWith('/ar') ? 'ar' : 'en'
  const t = COPY[locale]

  React.useEffect(() => {
    captureException(error, {
      scope: 'marketing.locale-error',
      tags: { locale, digest: error.digest ?? 'none' },
    })
  }, [error, locale])

  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg px-6 text-center text-fg">
      <DotPattern
        glow
        className="[mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)] text-fg-subtle/40"
      />
      <div className="relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10">
        <AlertTriangle className="h-6 w-6 text-danger" />
      </div>
      <p className="relative z-10 mt-8 font-mono text-[10px] uppercase tracking-wider text-danger">
        {t.eyebrow}
      </p>
      <h1 className="relative z-10 mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
        {t.title}
      </h1>
      <p className="relative z-10 mt-4 max-w-md text-sm leading-relaxed text-fg-muted">{t.body}</p>
      <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-2">
        <Button type="button" variant="accent" size="lg" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          {t.retry}
        </Button>
        <Button asChild variant="secondary" size="lg">
          <a href={`/${locale}`}>{t.home}</a>
        </Button>
      </div>
      {error.digest && (
        <p className="relative z-10 mt-10 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {t.digest} · {error.digest}
        </p>
      )}
    </div>
  )
}
