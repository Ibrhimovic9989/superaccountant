import { Logomark, Wordmark } from '@/components/brand/logo'
import { findReportByHash } from '@/lib/learning-curves/store'
import type { SupportedLocale } from '@sa/i18n'
import { FileDown, FileX, Languages, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

/**
 * Public learning-curve verification page.
 *
 * A recruiter who receives a SuperAccountant "learning trajectory" PDF
 * can hit /verify-curve/{hash} to confirm the document is authentic.
 *
 * The footer of every PDF includes this URL, HMAC-signed over
 * (userId, generatedAt). Mirrors /verify/[hash] for certificates — no
 * auth needed, but the [locale] segment is kept so the layout shell
 * + i18n provider can wrap it like every other app page.
 */

type Lang = 'en' | 'ar'

const COPY = {
  en: {
    notFoundTitle: 'Report not found',
    notFoundBody: "The hash you provided doesn't match any issued learning curve report.",
    okTitle: 'Verified learning curve',
    issuedBy: 'This learning curve report was issued by SuperAccountant on',
    issuedTo: 'to',
    open: 'View the PDF',
    poweredBy: 'Verified by SuperAccountant',
    switch: 'العربية',
  },
  ar: {
    notFoundTitle: 'لم يتم العثور على التقرير',
    notFoundBody: 'الرمز الذي قدمته لا يطابق أي تقرير منحنى تعلم صادر.',
    okTitle: 'منحنى تعلم موثق',
    issuedBy: 'تم إصدار تقرير منحنى التعلم هذا بواسطة سوبر أكاونتنت في',
    issuedTo: 'إلى',
    open: 'عرض ملف PDF',
    poweredBy: 'موثق بواسطة سوبر أكاونتنت',
    switch: 'English',
  },
} as const

export default async function VerifyCurvePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: SupportedLocale; hash: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { locale, hash } = await params
  const { lang: rawLang } = await searchParams
  const lang: Lang = rawLang === 'ar' || (!rawLang && locale === 'ar') ? 'ar' : 'en'
  const t = COPY[lang]
  const otherLang = lang === 'ar' ? 'en' : 'ar'

  const report = await findReportByHash(hash).catch(() => null)

  const issuedAt = report
    ? new Date(report.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null
  const studentName = report?.studentName ?? report?.studentEmail.split('@')[0] ?? '—'

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="relative isolate min-h-screen overflow-hidden bg-bg text-fg"
    >
      <header className="relative z-10 flex h-16 items-center justify-between px-6">
        <Link href={`/${locale}`} className="group flex items-center gap-2.5">
          <Logomark size={36} />
          <Wordmark className="text-base" />
        </Link>
        <Link
          href={`/${locale}/verify-curve/${hash}?lang=${otherLang}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-bg-elev px-2.5 font-mono text-[11px] uppercase tracking-wider text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg"
        >
          <Languages className="h-3 w-3" />
          {t.switch}
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl flex-col items-center justify-center px-6 py-12">
        {!report ? (
          <div className="w-full rounded-2xl border border-border bg-bg-elev p-12 text-center">
            <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10">
              <FileX className="h-6 w-6 text-danger" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{t.notFoundTitle}</h1>
            <p className="mt-3 text-sm text-fg-muted">{t.notFoundBody}</p>
            <p
              dir="ltr"
              className="mt-6 inline-block break-all rounded-md border border-border bg-bg px-3 py-1.5 font-mono text-[10px] text-fg-subtle"
            >
              {hash}
            </p>
          </div>
        ) : (
          <div className="w-full rounded-2xl border border-success/30 bg-success/5 p-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-success/30 bg-bg px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-success">
              <ShieldCheck className="h-3 w-3" />
              {t.okTitle}
            </div>
            <p className="text-base leading-relaxed text-fg">
              {t.issuedBy} <strong>{issuedAt}</strong> {t.issuedTo} <strong>{studentName}</strong>.
            </p>
            <a
              href={report.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg hover:opacity-90"
            >
              <FileDown className="h-4 w-4" />
              {t.open}
            </a>
            <p
              dir="ltr"
              className="mt-6 inline-block break-all rounded-md border border-border bg-bg px-3 py-1.5 font-mono text-[10px] text-fg-subtle"
            >
              {hash}
            </p>
          </div>
        )}

        <p className="mt-8 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {t.poweredBy}
        </p>
      </main>
    </div>
  )
}
