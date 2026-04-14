import Link from 'next/link'
import { FileX, Languages } from 'lucide-react'
import { PUBLIC_CONFIG } from '@/lib/config/public'
import { Logomark, Wordmark } from '@/components/brand/logo'
import { CertificateCard } from '@/components/certificate/certificate-card'
import { DotPattern } from '@/components/magicui/dot-pattern'

type VerifyResult = {
  valid: boolean
  studentName?: string
  market?: string
  score?: number
  issuedAt?: string
}

type Lang = 'en' | 'ar'

const COPY = {
  en: {
    notFoundTitle: 'Certificate not found',
    notFoundBody: "The hash you provided doesn't match any issued certificate.",
    poweredBy: 'Verified by SuperAccountant',
    switch: 'العربية',
  },
  ar: {
    notFoundTitle: 'لم يتم العثور على الشهادة',
    notFoundBody: 'الرمز الذي قدمته لا يطابق أي شهادة صادرة.',
    poweredBy: 'موثق بواسطة سوبر أكاونتنت',
    switch: 'English',
  },
} as const

/**
 * Public certificate verification page. No auth, no locale prefix.
 * Anyone with the link can verify a certificate by hash.
 */
export default async function PublicVerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ hash: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { hash } = await params
  const { lang: rawLang } = await searchParams
  const lang: Lang = rawLang === 'ar' ? 'ar' : 'en'
  const t = COPY[lang]
  const otherLang = lang === 'ar' ? 'en' : 'ar'

  let v: VerifyResult = { valid: false }
  try {
    const res = await fetch(`${PUBLIC_CONFIG.apiUrl}/verify/${hash}`, { cache: 'no-store' })
    if (res.ok) v = (await res.json()) as VerifyResult
  } catch {}

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="relative isolate min-h-screen overflow-hidden bg-bg text-fg"
    >
      <DotPattern
        glow
        className="[mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)] text-fg-subtle/30"
      />

      {/* Minimal top bar — just brand mark + locale toggle */}
      <header className="relative z-10 flex h-16 items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <Logomark size={36} />
          <Wordmark className="text-base" />
        </Link>
        <Link
          href={`/verify/${hash}?lang=${otherLang}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-bg-elev px-2.5 font-mono text-[11px] uppercase tracking-wider text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg"
        >
          <Languages className="h-3 w-3" />
          {t.switch}
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl flex-col items-center justify-center px-6 py-12">
        {!v.valid ? (
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
          <div className="w-full">
            <CertificateCard
              locale={lang}
              studentName={v.studentName ?? '—'}
              market={(v.market === 'ksa' ? 'ksa' : 'india') as 'india' | 'ksa'}
              score={v.score ?? 0}
              issuedAt={v.issuedAt ?? new Date().toISOString()}
              hash={hash}
              showActions={false}
            />
          </div>
        )}

        <p className="mt-8 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {t.poweredBy}
        </p>
      </main>
    </div>
  )
}
