import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import type { SupportedLocale } from '@sa/i18n'
import { AppNav } from '@/components/app-nav'
import { EntryTestRunner } from '@/components/welcome/entry-test-runner'
import { BlurFade } from '@/components/magicui/blur-fade'
import { getUserProfile } from '@/lib/data/profile'

export default async function EntryTestPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const userId = session.user.id

  const u = await getUserProfile(userId)
  if (!u?.preferredTrack) redirect(`/${locale}/welcome`)
  if (!u.profileCompletedAt) redirect(`/${locale}/welcome/profile`)
  const market = u.preferredTrack

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
            <span className="inline-block h-1 w-1 rounded-full bg-accent" />
            {locale === 'ar' ? 'الخطوة 3 من 3' : 'Step 3 of 3'}
          </div>
        </BlurFade>
        <BlurFade delay={0.1}>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {locale === 'ar' ? 'لنقيس مستواك' : "Let's see where you are"}
          </h1>
        </BlurFade>
        <BlurFade delay={0.15}>
          <p className="mt-3 max-w-xl text-sm text-fg-muted">
            {locale === 'ar'
              ? '10 أسئلة تكيفية. لا توجد إجابة صحيحة أو خاطئة — فقط نقطة بداية أفضل.'
              : "10 adaptive questions. Wrong answers help us place you correctly — there's no penalty."}
          </p>
        </BlurFade>

        <BlurFade delay={0.22} className="mt-10">
          <EntryTestRunner userId={userId} market={market} locale={locale} />
        </BlurFade>
      </main>
    </div>
  )
}
