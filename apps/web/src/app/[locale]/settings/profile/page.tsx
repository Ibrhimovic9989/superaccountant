import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AppNav } from '@/components/app-nav'
import { PageBackdrop } from '@/components/page-backdrop'
import { auth } from '@/lib/auth'
import { prisma } from '@sa/db'
import { ensureProfile } from '@/lib/community/profile-store'
import { SettingsProfileForm } from '@/components/community/settings-profile-form'
import type { ProfileTone, ProfileVisibility } from '@/lib/community/types'

export const metadata: Metadata = {
  title: 'Profile settings · SuperAccountant',
  robots: { index: false, follow: false },
}

type PageParams = { locale: 'en' | 'ar' }

export default async function SettingsProfilePage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id || !session.user.email) redirect(`/${locale}/sign-in`)

  await ensureProfile({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
  })

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      handle: string
      handleEditsRemaining: number
      bio: string | null
      tone: ProfileTone
      publicVisibility: ProfileVisibility
    }>
  >(
    `SELECT handle, "handleEditsRemaining", bio, tone, "publicVisibility"
       FROM "CommunityProfile" WHERE "userId" = $1 LIMIT 1`,
    session.user.id,
  )
  const profile = rows[0]!

  return (
    <div className="relative min-h-screen bg-bg text-fg">
      <PageBackdrop />
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />

      <main className="relative mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
            Settings
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Profile
          </h1>
        </header>
        <SettingsProfileForm
          initialHandle={profile.handle}
          handleEditsRemaining={profile.handleEditsRemaining}
          initialBio={profile.bio ?? ''}
          initialTone={profile.tone}
          initialVisibility={profile.publicVisibility}
        />
      </main>
    </div>
  )
}
