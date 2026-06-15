import { AppNav } from '@/components/app-nav'
import { CurriculumSidebar } from '@/components/lesson/curriculum-sidebar'
import { LessonShell } from '@/components/lesson/lesson-shell'
import { PracticalLinks } from '@/components/lesson/practical-links'
import { SaPointsHint } from '@/components/loyalty/sa-points-hint'
import { PageBackdrop } from '@/components/page-backdrop'
import { auth } from '@/lib/auth'
import { getAccessTier, hasFullAccess } from '@/lib/cohort/access'
import { getCurriculumTree } from '@/lib/data/curriculum-tree'
import { getGuideStubsBySlug, getLessonBySlug } from '@/lib/data/lessons'
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

  // SA-points hint + curriculum tree run in parallel with each other —
  // both are independent of the lesson body.
  const [saProgress, tree] = await Promise.all([
    getPhaseProgressForLesson({ userId: session.user.id, lessonId: lesson.id }).catch(() => null),
    getCurriculumTree(lesson.market, session.user.id).catch(() => null),
  ])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg text-fg">
      <PageBackdrop />
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />

      <div className="relative mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <SaPointsHint locale={locale} progress={saProgress} />

        {/* 2-column layout: sticky curriculum tree on the left, lesson on the
             right. Sidebar hides below lg — mobile sees the original full-width
             experience, no UI regression for small screens. */}
        <div className="mt-4 flex gap-6">
          {tree && (
            <aside className="sticky top-24 hidden h-fit w-72 shrink-0 lg:block">
              <CurriculumSidebar tree={tree} currentLessonSlug={slug} locale={locale} />
            </aside>
          )}
          <main className="relative min-w-0 flex-1">
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
            <PracticalLinks
              locale={locale}
              guides={getGuideStubsBySlug(lesson.relatedGuideSlugs)}
            />
          </main>
        </div>
      </div>
    </div>
  )
}
