import { AppNav } from '@/components/app-nav'
import { LessonShell } from '@/components/lesson/lesson-shell'
import { SaPointsHint } from '@/components/loyalty/sa-points-hint'
import { PageBackdrop } from '@/components/page-backdrop'
import { auth } from '@/lib/auth'
import { getAccessTier, hasFullAccess } from '@/lib/cohort/access'
import { getLessonBySlug } from '@/lib/data/lessons'
import { getPhaseProgressForLesson } from '@/lib/loyalty/phase-progress'
import { notFound, redirect } from 'next/navigation'

export default async function LessonPage({
  params,
}: {
  params: Promise<{ locale: 'en' | 'ar'; slug: string }>
}) {
  const { locale, slug } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const tier = await getAccessTier(session.user.id)
  if (!hasFullAccess(tier)) redirect(`/${locale}/cohort`)

  const lesson = await getLessonBySlug(slug)
  if (!lesson) notFound()

  // Phase progress for the SA Points hint banner. Cheap (3 small
  // queries) and runs in parallel with LessonShell rendering.
  const saProgress = await getPhaseProgressForLesson({
    userId: session.user.id,
    lessonId: lesson.id,
  }).catch(() => null)

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg text-fg">
      <PageBackdrop />
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />
      <div className="relative mx-auto max-w-4xl px-6 pt-6">
        <SaPointsHint locale={locale} progress={saProgress} />
      </div>
      <main className="relative">
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
