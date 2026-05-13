import { AppNav } from '@/components/app-nav'
import { BookkeepingSim } from '@/components/practice-lab/bookkeeping-sim'
import { auth } from '@/lib/auth'
import { getAccessTier, hasFullAccess } from '@/lib/cohort/access'
import { getUserProfile } from '@/lib/data/profile'
import type { SupportedLocale } from '@sa/i18n'
import { redirect } from 'next/navigation'

export default async function MonthlyBookkeepingPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const tier = await getAccessTier(session.user.id)
  if (!hasFullAccess(tier)) redirect(`/${locale}/cohort`)
  const u = await getUserProfile(session.user.id)
  if (!u?.preferredTrack) redirect(`/${locale}/welcome`)

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-fg">
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <BookkeepingSim locale={locale} />
      </main>
    </div>
  )
}
