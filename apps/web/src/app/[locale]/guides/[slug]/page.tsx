import { AppNav } from '@/components/app-nav'
import { GuidePlayer } from '@/components/guide/guide-player'
import { auth } from '@/lib/auth'
import { getGuideBySlug, getGuidesForMarket } from '@/lib/data/guides'
import { getUserProfile } from '@/lib/data/profile'
import type { SupportedLocale } from '@sa/i18n'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

const BACK_COPY = { en: 'All guides', ar: 'كل الأدلة' } as const

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale; slug: string }>
}) {
  const { locale, slug } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const u = await getUserProfile(session.user.id)
  if (!u?.preferredTrack) redirect(`/${locale}/welcome`)

  const guide = getGuideBySlug(slug)
  if (!guide) notFound()

  const visible = getGuidesForMarket(u.preferredTrack).some((g) => g.slug === guide.slug)
  if (!visible) notFound()

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-fg">
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />
      <main>
        <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
          <Link
            href={`/${locale}/guides`}
            className="inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            {BACK_COPY[locale]}
          </Link>
        </div>
        <GuidePlayer guide={guide} locale={locale} />
      </main>
    </div>
  )
}
