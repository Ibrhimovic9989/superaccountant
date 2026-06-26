import 'server-only'
import { prisma } from '@sa/db'
import { unstable_cache } from 'next/cache'
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

/**
 * Pure compute — given the raw rows we already pulled from Prisma,
 * synthesise the DashboardSnapshot. Pulled out so the wrapping cache
 * layer can fetch + compute without locking us into one query shape.
 *
 * 60-second unstable_cache below the fold. The dashboard is the most
 * re-loaded page in the app; ~90% of loads from a given session are
 * within 60s of the last load. Cache hits return in <50ms vs the
 * uncached ~1.5s (Mumbai→Seoul DB hop × 2 parallel fan-outs).
 */
async function buildSnapshot(userId: string): Promise<DashboardSnapshot> {
  // 1. The user's market drives every subsequent query. Cheapest call.
  const user = await prisma.identityUser.findUnique({
    where: { id: userId },
    select: { preferredTrack: true },
  })
  const market = (user?.preferredTrack ?? 'india') as 'india' | 'ksa'

  // 2. Fan out the four independent reads in parallel. Slashes the
  //    previous waterfall (4 × ~80ms Mumbai→Seoul = 320ms) to a single
  //    round-trip of ~80–120ms wall-clock.
  const [lessons, enrollment, sessionRows, todayAttempt] = await Promise.all([
    prisma.curriculumLesson.findMany({
      where: { module: { phase: { track: { market } } } },
      include: { module: { include: { phase: true } } },
      orderBy: [
        { module: { phase: { order: 'asc' } } },
        { module: { order: 'asc' } },
        { order: 'asc' },
      ],
    }),
    prisma.learningEnrollment.findFirst({ where: { userId, trackId: market } }),
    prisma.$queryRaw<{ totalMinutes: number }[]>`
      SELECT COALESCE(
        SUM(EXTRACT(EPOCH FROM (COALESCE("endedAt", NOW()) - "startedAt")) / 60),
        0
      )::float as "totalMinutes"
      FROM "TutoringSession"
      WHERE "userId" = ${userId}
    `,
    (() => {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      return prisma.assessmentAttempt.findFirst({
        where: { userId, kind: 'daily', startedAt: { gte: start } },
        orderBy: { startedAt: 'desc' },
      })
    })(),
  ])

  // 3. Progress depends on the enrollment id, so it has to follow the
  //    fan-out above. Single round-trip.
  const progress = enrollment
    ? await prisma.learningProgress.findMany({
        where: { enrollmentId: enrollment.id },
      })
    : []
  const progressByLessonId = new Map(progress.map((p) => [p.lessonId, p]))

  // 3. Resume = lowest-mastery in-progress, fallback to first untouched.
  const inProgress = lessons
    .filter((l) => progressByLessonId.has(l.id))
    .map((l) => ({ lesson: l, mastery: progressByLessonId.get(l.id)?.mastery ?? 0 }))
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

  // 4. Stats — pure math on rows we already have, no extra round-trips.
  const completedLessons = progress.filter((p) => p.mastery >= 0.75).length
  const averageMastery =
    progress.length > 0 ? progress.reduce((a, p) => a + p.mastery, 0) / progress.length : 0
  const tutorHours = (sessionRows[0]?.totalMinutes ?? 0) / 60
  const hoursStudied = Math.round((progress.length * 0.25 + tutorHours) * 10) / 10
  const streakDays = computeStreak(progress.map((p) => p.lastReviewedAt))

  // 5. Today's items — picked from the already-fetched todayAttempt.
  const todayItems = todayAttempt
    ? ((todayAttempt.payload as { items?: Array<{ kind: 'review' | 'weak' | 'new'; lessonSlug: string; lessonTitle: string }> })?.items ?? [])
    : []

  // 6. Phase progress — pure math.
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
}

/**
 * Public entry — wraps buildSnapshot() in:
 *   - React's per-request `cache()` so two components on the same page
 *     don't hit Prisma twice.
 *   - Next's `unstable_cache` keyed by userId with a 60s revalidate
 *     window so a refresh-happy student doesn't pay the Mumbai→Seoul
 *     waterfall on every navigation.
 *
 * Stale tolerance: 60s. The displayed stats (mastery, streak, today's
 * items) only need to be "near-real-time" — a lesson completed 30s ago
 * showing on the next reload is fine. Mutation points (lesson complete,
 * grand-test submit) can later call `revalidateTag(\`dash:\${userId}\`)`
 * for instant freshness; the tag is already attached.
 */
export const getDashboardSnapshot = cache((userId: string) =>
  unstable_cache(() => buildSnapshot(userId), ['dash-snapshot', userId], {
    revalidate: 60,
    tags: [`dash:${userId}`],
  })(),
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
