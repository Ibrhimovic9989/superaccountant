import { redirect } from 'next/navigation'
import { GraduationCap } from 'lucide-react'
import { auth } from '@/lib/auth'
import { GrandTestRunner } from '@/components/grand-test/grand-test-runner'
import { AppNav } from '@/components/app-nav'
import { BlurFade } from '@/components/magicui/blur-fade'
import type { SupportedLocale } from '@sa/i18n'

const COPY = {
  en: { badge: 'Final exam', title: 'Grand test' },
  ar: { badge: 'الاختبار النهائي', title: 'الاختبار الكبير' },
} as const

export default async function GrandTestPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const t = COPY[locale]

  return (
    <div className="min-h-screen bg-bg text-fg">
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />
      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <BlurFade delay={0.05}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            <GraduationCap className="h-3 w-3 text-accent" />
            {t.badge}
          </div>
        </BlurFade>
        <BlurFade delay={0.1}>
          <h1 className="mb-10 text-4xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
        </BlurFade>
        <BlurFade delay={0.15}>
          <GrandTestRunner userId={session.user.id} locale={locale} />
        </BlurFade>
      </main>
    </div>
  )
}
