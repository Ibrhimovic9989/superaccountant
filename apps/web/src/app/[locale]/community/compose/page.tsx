import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CommunityNav } from '@/components/community/community-nav'
import { auth } from '@/lib/auth'
import { ComposeForm } from '@/components/community/compose-form'
import { Sticker } from '@/components/community/su/primitives'

export const metadata: Metadata = {
  title: 'Compose · SuperAccountant Community',
  robots: { index: false, follow: false },
}

type PageParams = { locale: 'en' | 'ar' }

export default async function ComposePage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)

  return (
    <div className="relative min-h-screen bg-cream text-ink">
      <CommunityNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />

      <main className="relative mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mb-2 inline-block font-mono text-xs font-bold uppercase tracking-[0.18em] text-coral">
              ✍️ Compose
            </span>
            <h1 className="font-display text-3xl font-extrabold leading-none tracking-tight text-ink sm:text-4xl">
              What&apos;s on your mind?
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Sticker tone="butter" rotate="3deg" className="hidden sm:inline-flex">
              🔥 Post something real
            </Sticker>
            <Link
              href={`/${locale}/community`}
              className="rounded-full border-2 border-ink bg-white px-4 py-2 text-sm font-bold text-ink transition-all hover:bg-ink hover:text-cream"
            >
              Cancel
            </Link>
          </div>
        </div>
        <ComposeForm locale={locale} />
      </main>
    </div>
  )
}
