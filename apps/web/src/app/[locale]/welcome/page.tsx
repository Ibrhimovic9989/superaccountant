import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@sa/db'
import type { SupportedLocale } from '@sa/i18n'
import { AppNav } from '@/components/app-nav'
import { MarketPicker } from '@/components/welcome/market-picker'
import { BlurFade } from '@/components/magicui/blur-fade'
import { getPoolCounts } from '@/lib/data/welcome'
import { getUserProfile } from '@/lib/data/profile'

export default async function WelcomePage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const userId = session.user.id

  // If they've already picked a market, skip ahead to profile (or beyond).
  const u = await getUserProfile(userId)
  if (u?.preferredTrack) {
    if (u.profileCompletedAt) redirect(`/${locale}/welcome/entry-test`)
    redirect(`/${locale}/welcome/profile`)
  }

  const pool = await getPoolCounts()

  async function save(formData: FormData) {
    'use server'
    const market = String(formData.get('market') ?? '')
    if (market !== 'india' && market !== 'ksa') return
    await prisma.identityUser.update({
      where: { id: userId },
      data: { preferredTrack: market },
    })
    redirect(`/${locale}/welcome/profile`)
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <BlurFade delay={0.05}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            <span className="inline-block h-1 w-1 rounded-full bg-accent" />
            {locale === 'ar' ? 'الخطوة 1 من 3' : 'Step 1 of 3'}
          </div>
        </BlurFade>
        <BlurFade delay={0.1}>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {locale === 'ar' ? 'اختر سوقك' : 'Pick your market'}
          </h1>
        </BlurFade>
        <BlurFade delay={0.15}>
          <p className="mt-4 max-w-xl text-base text-fg-muted">
            {locale === 'ar'
              ? "ستتعلم القواعد والأدوات الخاصة بالمكان الذي تعمل فيه. لا يمكنك تغيير هذا لاحقاً، لكن تستطيع التبديل بين المسارات."
              : "You'll learn the rules and tools specific to where you work. You can switch tracks later from settings."}
          </p>
        </BlurFade>

        <BlurFade delay={0.22}>
          <MarketPicker locale={locale} pool={pool} action={save} />
        </BlurFade>
      </main>
    </div>
  )
}
