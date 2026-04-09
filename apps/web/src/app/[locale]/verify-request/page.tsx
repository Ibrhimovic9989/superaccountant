import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'
import type { SupportedLocale } from '@sa/i18n'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'

const COPY = {
  en: {
    badge: 'Email sent',
    title: 'Check your email',
    body: "We sent a sign-in link to your inbox. Click it to finish signing in.",
    expires: 'The link expires in 24 hours.',
    tip: "Can't find it? Check your spam folder.",
    back: 'Back to sign in',
  },
  ar: {
    badge: 'تم إرسال البريد',
    title: 'تحقق من بريدك الإلكتروني',
    body: 'أرسلنا رابط تسجيل الدخول إلى صندوق الوارد. اضغط عليه لإكمال تسجيل الدخول.',
    expires: 'تنتهي صلاحية الرابط خلال 24 ساعة.',
    tip: 'لا تجده؟ تحقق من مجلد الرسائل غير المرغوب فيها.',
    back: 'العودة إلى تسجيل الدخول',
  },
} as const

export default async function VerifyRequestPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const t = COPY[locale]

  return (
    <AuthShell locale={locale}>
      <div className="text-center">
        <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg-elev">
          <Mail className="h-6 w-6 text-accent" />
        </div>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-success">
          <span className="inline-block h-1 w-1 rounded-full bg-success" />
          {t.badge}
        </div>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
        <p className="mt-3 text-sm text-fg-muted">{t.body}</p>

        <div className="mt-6 rounded-xl border border-border bg-bg-elev p-4 text-start">
          <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {locale === 'ar' ? 'صلاحية' : 'Expiry'}
          </p>
          <p className="mt-1 text-sm text-fg">{t.expires}</p>
        </div>

        <p className="mt-4 text-xs text-fg-subtle">{t.tip}</p>

        <Button asChild variant="ghost" className="mt-8">
          <Link href={`/${locale}/sign-in`}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t.back}
          </Link>
        </Button>
      </div>
    </AuthShell>
  )
}
