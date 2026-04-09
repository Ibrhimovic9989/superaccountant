'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { captureException } from '@/lib/observability'

const COPY = {
  en: {
    eyebrow: 'Something broke',
    title: "That didn't work.",
    body: 'An unexpected error happened while loading this page. The team has been notified — you can try again, or head back to the dashboard.',
    retry: 'Try again',
    dashboard: 'Go to dashboard',
    digest: 'Error reference',
  },
  ar: {
    eyebrow: 'حدث خطأ',
    title: 'لم ينجح ذلك.',
    body: 'حدث خطأ غير متوقع أثناء تحميل هذه الصفحة. تم إخطار الفريق — يمكنك المحاولة مرة أخرى، أو العودة إلى لوحة التحكم.',
    retry: 'حاول مرة أخرى',
    dashboard: 'اذهب إلى لوحة التحكم',
    digest: 'رمز الخطأ',
  },
} as const

/**
 * Error boundary for the [locale] segment. Renders when a server component
 * throws or a client component crashes during render.
 */
export default function LocaleError({
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
      scope: 'web.locale-error',
      tags: { locale, digest: error.digest ?? 'none' },
    })
  }, [error, locale])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center text-fg">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10">
        <AlertTriangle className="h-6 w-6 text-danger" />
      </div>
      <p className="mt-8 font-mono text-[10px] uppercase tracking-wider text-danger">
        {t.eyebrow}
      </p>
      <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
        {t.title}
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-fg-muted">{t.body}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        <Button type="button" variant="accent" size="lg" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          {t.retry}
        </Button>
        <Button asChild variant="secondary" size="lg">
          <a href={`/${locale}/dashboard`}>{t.dashboard}</a>
        </Button>
      </div>
      {error.digest && (
        <p className="mt-10 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {t.digest} · {error.digest}
        </p>
      )}
    </div>
  )
}
