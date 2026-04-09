import { ArrowRight } from 'lucide-react'
import { signIn } from '@/lib/auth'
import type { SupportedLocale } from '@sa/i18n'
import { AuthShell } from '@/components/auth/auth-shell'
import { SubmitButton } from '@/components/ui/loading'
import { marketingLink } from '@/lib/config/public'

const COPY = {
  en: {
    title: 'Welcome back',
    subtitle: 'Sign in to continue your placement.',
    google: 'Continue with Google',
    googlePending: 'Redirecting to Google…',
    or: 'OR',
    emailLabel: 'Work email',
    emailPlaceholder: 'you@firm.com',
    sendLink: 'Send sign-in link',
    sendLinkPending: 'Sending link…',
    termsBefore: 'By continuing you agree to the ',
    termsLink: 'terms of use',
    termsAnd: ' and ',
    privacyLink: 'privacy policy',
    termsAfter: '.',
  },
  ar: {
    title: 'مرحبًا بعودتك',
    subtitle: 'سجّل الدخول لمتابعة تحديد مستواك.',
    google: 'المتابعة باستخدام Google',
    googlePending: 'جارٍ التحويل إلى Google…',
    or: 'أو',
    emailLabel: 'البريد الإلكتروني للعمل',
    emailPlaceholder: 'you@firm.com',
    sendLink: 'إرسال رابط تسجيل الدخول',
    sendLinkPending: 'جارٍ إرسال الرابط…',
    termsBefore: 'بمتابعتك فإنك توافق على ',
    termsLink: 'شروط الاستخدام',
    termsAnd: ' و',
    privacyLink: 'سياسة الخصوصية',
    termsAfter: '.',
  },
} as const

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const t = COPY[locale]

  async function googleAction() {
    'use server'
    await signIn('google', { redirectTo: `/${locale}/dashboard` })
  }

  async function emailAction(formData: FormData) {
    'use server'
    const email = String(formData.get('email') ?? '').trim()
    if (!email) return
    await signIn('nodemailer', {
      email,
      redirectTo: `/${locale}/dashboard`,
    })
  }

  return (
    <AuthShell locale={locale}>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
      <p className="mt-3 text-sm text-fg-muted">{t.subtitle}</p>

      <div className="mt-10 space-y-3">
        <form action={googleAction}>
          <SubmitButton
            variant="secondary"
            size="lg"
            className="w-full"
            pendingLabel={t.googlePending}
          >
            <GoogleIcon />
            {t.google}
          </SubmitButton>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {t.or}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form action={emailAction} className="space-y-3">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-fg-muted"
            >
              {t.emailLabel}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder={t.emailPlaceholder}
              className="block w-full rounded-lg border border-border bg-bg-elev px-4 py-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent"
            />
          </div>
          <SubmitButton
            variant="accent"
            size="lg"
            className="w-full"
            pendingLabel={t.sendLinkPending}
          >
            {t.sendLink}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </SubmitButton>
        </form>
      </div>

      <p className="mt-10 text-center text-xs text-fg-subtle">
        {t.termsBefore}
        <a
          href={marketingLink(locale, '/terms')}
          target="_blank"
          rel="noreferrer"
          className="text-fg-muted underline underline-offset-2 hover:text-fg"
        >
          {t.termsLink}
        </a>
        {t.termsAnd}
        <a
          href={marketingLink(locale, '/privacy')}
          target="_blank"
          rel="noreferrer"
          className="text-fg-muted underline underline-offset-2 hover:text-fg"
        >
          {t.privacyLink}
        </a>
        {t.termsAfter}
      </p>
    </AuthShell>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
