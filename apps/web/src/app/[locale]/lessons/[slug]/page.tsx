import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getLessonBySlug } from '@/lib/data/lessons'
import { LessonShell } from '@/components/lesson/lesson-shell'
import { AppNav } from '@/components/app-nav'

export default async function LessonPage({
  params,
}: {
  params: Promise<{ locale: 'en' | 'ar'; slug: string }>
}) {
  const { locale, slug } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)

  const lesson = await getLessonBySlug(slug)
  if (!lesson) notFound()

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-fg">
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />
      <main>
        <LessonShell
          lesson={lesson}
          locale={locale}
          userId={session.user.id}
          tutorContext={{
            sessionId: `${session.user.id}-${slug}`,
            userId: session.user.id,
            market: lesson.market,
            locale,
            currentLessonSlug: slug,
          }}
        />
      </main>
    </div>
  )
}
