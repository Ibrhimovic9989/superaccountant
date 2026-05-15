import { Logo } from '@/components/brand/logo'
import { ConsentForm } from '@/components/consent/consent-form'
import { BlurFade } from '@/components/magicui/blur-fade'
import { PageBackdrop } from '@/components/page-backdrop'
import { auth } from '@/lib/auth'
import { CURRENT_TERMS_VERSION, getUserProfile, recordUserConsent } from '@/lib/data/profile'
import type { SupportedLocale } from '@sa/i18n'
import { ShieldCheck } from 'lucide-react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

const COPY = {
  en: {
    eyebrow: 'One quick agreement',
    title: 'Before we get you started.',
    subtitle:
      'We need your explicit OK on a few things so we can take payments, issue certificates, and protect your data. Tick the boxes you understand, then continue.',
    backToSignIn: 'Wrong account? Sign out',
  },
  ar: {
    eyebrow: 'موافقة سريعة',
    title: 'قبل أن نبدأ.',
    subtitle:
      'نحتاج موافقتك الصريحة على بعض الأمور لنتمكن من تحصيل المدفوعات وإصدار الشهادات وحماية بياناتك. ضع علامة على البنود التي فهمتها ثم تابع.',
    backToSignIn: 'حساب خاطئ؟ سجل خروج',
  },
} as const

export default async function ConsentPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)

  const profile = await getUserProfile(session.user.id)
  // Already consented to the current terms version → skip straight on.
  if (profile?.consentedAt && profile.consentedTermsVersion === CURRENT_TERMS_VERSION) {
    redirect(`/${locale}/welcome`)
  }

  const t = COPY[locale]
  const termsHref = `/${locale}/terms`
  const refundHref = `/${locale}/refund-policy`

  // Server action that lives on the page so the closure captures locale.
  async function submitConsent(): Promise<{ ok: true } | { ok: false; error: string }> {
    'use server'
    const s = await auth()
    if (!s?.user?.id) return { ok: false, error: 'unauthenticated' }
    const hdrs = await headers()
    // x-forwarded-for is set by Vercel; first hop is the real client.
    const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? null
    try {
      await recordUserConsent(s.user.id, {
        version: CURRENT_TERMS_VERSION,
        ip,
        userAgent: hdrs.get('user-agent') ?? null,
      })
      return { ok: true }
    } catch (err) {
      console.error('[recordUserConsent] failed', { userId: s.user.id, err })
      return { ok: false, error: 'server_error' }
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg text-fg">
      <PageBackdrop />
      <main className="relative mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <BlurFade delay={0.02}>
          <div className="mb-8 inline-flex items-center gap-2.5">
            <Logo size="sm" />
          </div>
        </BlurFade>
        <BlurFade delay={0.05}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft/40 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-accent">
            <ShieldCheck className="h-3 w-3" />
            {t.eyebrow}
          </div>
        </BlurFade>
        <BlurFade delay={0.1}>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
        </BlurFade>
        <BlurFade delay={0.15}>
          <p className="mt-3 max-w-xl text-sm text-fg-muted sm:text-base">{t.subtitle}</p>
        </BlurFade>
        <BlurFade delay={0.2}>
          <div className="mt-10">
            <ConsentForm
              locale={locale}
              termsHref={termsHref}
              refundHref={refundHref}
              submitConsent={submitConsent}
              nextHref={`/${locale}/welcome`}
            />
          </div>
        </BlurFade>
        <BlurFade delay={0.3}>
          <p className="mt-8 text-center text-xs text-fg-subtle">
            <a href={`/api/auth/signout?callbackUrl=/${locale}/sign-in`} className="hover:text-fg">
              {t.backToSignIn}
            </a>
          </p>
        </BlurFade>
      </main>
    </div>
  )
}
