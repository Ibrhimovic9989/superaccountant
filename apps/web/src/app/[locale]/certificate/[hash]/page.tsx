import { redirect } from 'next/navigation'
import { ArrowLeft, FileX } from 'lucide-react'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { PUBLIC_CONFIG } from '@/lib/config/public'
import type { SupportedLocale } from '@sa/i18n'
import { AppNav } from '@/components/app-nav'
import { CertificateCard } from '@/components/certificate/certificate-card'
import { BlurFade } from '@/components/magicui/blur-fade'
import { Button } from '@/components/ui/button'

type VerifyResult = {
  valid: boolean
  studentName?: string
  market?: string
  score?: number
  issuedAt?: string
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale; hash: string }>
}) {
  const { locale, hash } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)

  let v: VerifyResult = { valid: false }
  try {
    const res = await fetch(`${PUBLIC_CONFIG.apiUrl}/verify/${hash}`, { cache: 'no-store' })
    if (res.ok) v = (await res.json()) as VerifyResult
  } catch {}

  // Public verify URL (the no-auth share link)
  const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/verify/${hash}`
  // Direct PDF download from the API
  const pdfUrl = `${PUBLIC_CONFIG.apiUrl}/verify/${hash}/pdf`

  return (
    <div className="min-h-screen bg-bg text-fg">
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />

      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        {!v.valid ? (
          <BlurFade delay={0.05}>
            <div className="rounded-2xl border border-border bg-bg-elev p-12 text-center">
              <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10">
                <FileX className="h-6 w-6 text-danger" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {locale === 'ar' ? 'لم يتم العثور على الشهادة' : 'Certificate not found'}
              </h1>
              <p className="mt-3 text-sm text-fg-muted">
                {locale === 'ar'
                  ? 'الرمز الذي قدمته لا يطابق أي شهادة صادرة.'
                  : "The hash you provided doesn't match any issued certificate."}
              </p>
              <Button asChild variant="ghost" className="mt-8">
                <Link href={`/${locale}/dashboard`}>
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                  {locale === 'ar' ? 'لوحة التحكم' : 'Back to dashboard'}
                </Link>
              </Button>
            </div>
          </BlurFade>
        ) : (
          <BlurFade delay={0.05}>
            <CertificateCard
              locale={locale}
              studentName={v.studentName ?? '—'}
              market={(v.market === 'ksa' ? 'ksa' : 'india') as 'india' | 'ksa'}
              score={v.score ?? 0}
              issuedAt={v.issuedAt ?? new Date().toISOString()}
              hash={hash}
              pdfUrl={pdfUrl}
              verifyUrl={verifyUrl}
              showActions
            />
          </BlurFade>
        )}
      </main>
    </div>
  )
}
