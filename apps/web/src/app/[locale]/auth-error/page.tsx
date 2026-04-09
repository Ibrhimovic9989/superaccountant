import Link from 'next/link'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import type { SupportedLocale } from '@sa/i18n'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'

const KNOWN_ERRORS = ['Configuration', 'AccessDenied', 'Verification'] as const
type KnownError = (typeof KNOWN_ERRORS)[number]

const COPY = {
  en: {
    badge: 'Authentication error',
    title: "We couldn't sign you in",
    Configuration: 'Server configuration error. Please contact support.',
    AccessDenied: "Access denied. You don't have permission to sign in.",
    Verification: 'The sign-in link is invalid or has expired. Request a new one.',
    default: 'Something went wrong. Please try signing in again.',
    back: 'Back to sign in',
    code: 'Error code',
  },
  ar: {
    badge: 'خطأ في المصادقة',
    title: 'لم نتمكن من تسجيل دخولك',
    Configuration: 'خطأ في إعداد الخادم. يرجى التواصل مع الدعم.',
    AccessDenied: 'تم رفض الوصول. ليس لديك إذن لتسجيل الدخول.',
    Verification: 'رابط تسجيل الدخول غير صالح أو منتهي الصلاحية. اطلب رابطًا جديدًا.',
    default: 'حدث خطأ ما. يرجى محاولة تسجيل الدخول مرة أخرى.',
    back: 'العودة إلى تسجيل الدخول',
    code: 'رمز الخطأ',
  },
} as const

export default async function AuthErrorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: SupportedLocale }>
  searchParams: Promise<{ error?: string }>
}) {
  const { locale } = await params
  const { error } = await searchParams
  const t = COPY[locale]

  const messageKey: KnownError | 'default' =
    error && (KNOWN_ERRORS as readonly string[]).includes(error)
      ? (error as KnownError)
      : 'default'

  return (
    <AuthShell locale={locale}>
      <div className="text-center">
        <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10">
          <AlertTriangle className="h-6 w-6 text-danger" />
        </div>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-danger/30 bg-danger/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-danger">
          <span className="inline-block h-1 w-1 rounded-full bg-danger" />
          {t.badge}
        </div>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
        <p className="mt-3 text-sm text-fg-muted">{t[messageKey]}</p>

        {error && (
          <div className="mt-6 rounded-xl border border-border bg-bg-elev p-4 text-start">
            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {t.code}
            </p>
            <p className="mt-1 font-mono text-xs text-fg">{error}</p>
          </div>
        )}

        <Button asChild variant="accent" size="lg" className="mt-8">
          <Link href={`/${locale}/sign-in`}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t.back}
          </Link>
        </Button>
      </div>
    </AuthShell>
  )
}
