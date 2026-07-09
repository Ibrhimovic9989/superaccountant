import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppNav } from '@/components/app-nav'
import { PageBackdrop } from '@/components/page-backdrop'
import { auth } from '@/lib/auth'
import { ComposeForm } from '@/components/community/compose-form'

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
    <div className="relative min-h-screen bg-bg text-fg">
      <PageBackdrop />
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />

      <main className="relative mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
              Compose
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              What's on your mind?
            </h1>
          </div>
          <Link
            href={`/${locale}/community`}
            className="rounded-full border border-border bg-bg-elev px-3 py-1.5 text-xs text-fg-muted hover:border-border-strong hover:text-fg"
          >
            Cancel
          </Link>
        </div>
        <ComposeForm locale={locale} />
      </main>
    </div>
  )
}
