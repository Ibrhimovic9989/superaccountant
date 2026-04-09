import 'server-only'
import { prisma } from '@sa/db'
import { cache } from 'react'

export type DashboardSnapshot = {
  market: 'india' | 'ksa'
  resume: { slug: string; titleEn: string; titleAr: string; mastery: number } | null
  totalLessons: number
  completedLessons: number
  averageMastery: number // 0..1
  streakDays: number
  hoursStudied: number // approximation: lessons completed × 0.25
  todayItems: Array<{
    kind: 'review' | 'weak' | 'new'
    lessonSlug: string
    lessonTitle: string
  }>
  phases: Array<{
    order: number
    titleEn: string
    titleAr: string
    total: number
    completed: number
  }>
}

export const getDashboardSnapshot = cache(
  async (userId: string): Promise<DashboardSnapshot> => {
    const user = await prisma.identityUser.findUnique({
      where: { id: userId },
      select: { preferredTrack: true },
    })
    const market = (user?.preferredTrack ?? 'india') as 'india' | 'ksa'

    // 1. Track lessons
    const lessons = await prisma.curriculumLesson.findMany({
      where: { module: { phase: { track: { market } } } },
      include: { module: { include: { phase: true } } },
      orderBy: [
        { module: { phase: { order: 'asc' } } },
        { module: { order: 'asc' } },
        { order: 'asc' },
      ],
    })

    // 2. Progress rows
    const enrollment = await prisma.learningEnrollment.findFirst({
      where: { userId, trackId: market },
    })
    const progress = enrollment
      ? await prisma.learningProgress.findMany({
          where: { enrollmentId: enrollment.id },
        })
      : []
    const progressByLessonId = new Map(progress.map((p) => [p.lessonId, p]))

    // 3. Resume = lowest-mastery in-progress, fallback to first untouched
    const inProgress = lessons
      .filter((l) => progressByLessonId.has(l.id))
      .map((l) => ({
        lesson: l,
        mastery: progressByLessonId.get(l.id)?.mastery ?? 0,
      }))
      .filter((x) => x.mastery < 1)
      .sort((a, b) => a.mastery - b.mastery)
    const firstUntouched = lessons.find((l) => !progressByLessonId.has(l.id))
    const resumeLesson = inProgress[0]?.lesson ?? firstUntouched ?? null
    const resume = resumeLesson
      ? {
          slug: resumeLesson.slug,
          titleEn: resumeLesson.titleEn,
          titleAr: resumeLesson.titleAr,
          mastery: progressByLessonId.get(resumeLesson.id)?.mastery ?? 0,
        }
      : null

    // 4. Stats
    const completedLessons = progress.filter((p) => p.mastery >= 0.75).length
    const averageMastery =
      progress.length > 0
        ? progress.reduce((a, p) => a + p.mastery, 0) / progress.length
        : 0
    // Hours = lessons reviewed × 0.25h + tutor session time.
    const sessionRows = await prisma.$queryRaw<{ totalMinutes: number }[]>`
      SELECT COALESCE(
        SUM(EXTRACT(EPOCH FROM (COALESCE("endedAt", NOW()) - "startedAt")) / 60),
        0
      )::float as "totalMinutes"
      FROM "TutoringSession"
      WHERE "userId" = ${userId}
    `
    const tutorHours = (sessionRows[0]?.totalMinutes ?? 0) / 60
    const hoursStudied = Math.round((progress.length * 0.25 + tutorHours) * 10) / 10
    // Streak — count consecutive days with lastReviewedAt back from today.
    const streakDays = computeStreak(progress.map((p) => p.lastReviewedAt))

    // 5. Today's items — read the most recent daily attempt
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const todayAttempt = await prisma.assessmentAttempt.findFirst({
      where: { userId, kind: 'daily', startedAt: { gte: startOfDay } },
      orderBy: { startedAt: 'desc' },
    })
    const todayItems = todayAttempt
      ? ((todayAttempt.payload as { items?: Array<{ kind: 'review' | 'weak' | 'new'; lessonSlug: string; lessonTitle: string }> })?.items ?? [])
      : []

    // 6. Phase progress
    const phaseMap = new Map<
      number,
      { titleEn: string; titleAr: string; total: number; completed: number }
    >()
    for (const l of lessons) {
      const order = l.module.phase.order
      const entry = phaseMap.get(order) ?? {
        titleEn: l.module.phase.titleEn,
        titleAr: l.module.phase.titleAr,
        total: 0,
        completed: 0,
      }
      entry.total++
      if ((progressByLessonId.get(l.id)?.mastery ?? 0) >= 0.75) entry.completed++
      phaseMap.set(order, entry)
    }
    const phases = Array.from(phaseMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([order, p]) => ({ order, ...p }))

    return {
      market,
      resume,
      totalLessons: lessons.length,
      completedLessons,
      averageMastery,
      streakDays,
      hoursStudied,
      todayItems,
      phases,
    }
  },
)

function computeStreak(dates: Array<Date | null>): number {
  const days = new Set<string>()
  for (const d of dates) {
    if (!d) continue
    days.add(d.toISOString().slice(0, 10))
  }
  let streak = 0
  const cur = new Date()
  cur.setHours(0, 0, 0, 0)
  // Look back up to 90 days
  for (let i = 0; i < 90; i++) {
    const key = cur.toISOString().slice(0, 10)
    if (days.has(key)) {
      streak++
      cur.setDate(cur.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}
