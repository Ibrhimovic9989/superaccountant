import { prisma } from '@sa/db'
import { unstable_cache } from 'next/cache'
import { cache } from 'react'

/**
 * Phase-progress computation for the SA Points lesson hint.
 *
 * Given a user and a lesson, returns where the user stands in that
 * lesson's parent phase + whether the 200-SA phase-completion credit
 * has already landed for them.
 *
 * Used by <SaPointsHint> on every lesson page so students see a live
 * "X lessons to go → 200 SA" reminder without leaving the curriculum.
 */

export type LessonPhaseProgress = {
  phaseId: string
  phaseTitleEn: string
  phaseTitleAr: string
  /** 1..N phase order in the track (for "Phase 2 · Core" display). */
  phaseOrder: number
  totalLessons: number
  completedLessons: number
  /** True if a phase_complete:<phaseId> milestone has already credited. */
  alreadyAwarded: boolean
  /** SA points the user will receive when the phase is finished. */
  awardPoints: number
}

const PHASE_AWARD = 200

/**
 * Lesson-page SA-points hint — 4 sequential queries (lesson lookup,
 * phase lessons, enrollment, milestone check), each ~80ms Mumbai→Seoul.
 * 60s cache keyed by (userId, lessonId), tagged by userId so
 * lesson-complete invalidations sweep the user's whole lesson grid.
 */
export function getPhaseProgressForLesson(args: {
  userId: string
  lessonId: string
}): Promise<LessonPhaseProgress | null> {
  return getPhaseProgressCached(args.userId, args.lessonId)
}

const getPhaseProgressCached = cache((userId: string, lessonId: string) =>
  unstable_cache(
    () => loadPhaseProgress({ userId, lessonId }),
    ['phase-progress', userId, lessonId],
    { revalidate: 60, tags: [`phase-progress:${userId}`] },
  )(),
)

async function loadPhaseProgress(args: {
  userId: string
  lessonId: string
}): Promise<LessonPhaseProgress | null> {
  // Resolve the lesson's phase + track (one query).
  const lesson = await prisma.curriculumLesson.findUnique({
    where: { id: args.lessonId },
    select: {
      module: {
        select: {
          phase: {
            select: {
              id: true,
              order: true,
              titleEn: true,
              titleAr: true,
              track: { select: { market: true } },
            },
          },
        },
      },
    },
  })
  if (!lesson) return null
  const phase = lesson.module.phase
  const market = phase.track.market

  // All lesson IDs in this phase (across all its modules).
  const phaseLessons = await prisma.curriculumLesson.findMany({
    where: { module: { phaseId: phase.id } },
    select: { id: true },
  })
  const totalLessons = phaseLessons.length
  if (totalLessons === 0) return null

  // Count user's progress rows scoped to those lessons.
  const enrollment = await prisma.learningEnrollment.findFirst({
    where: { userId: args.userId, trackId: market },
    select: { id: true },
  })
  const completedLessons = enrollment
    ? await prisma.learningProgress.count({
        where: {
          enrollmentId: enrollment.id,
          lessonId: { in: phaseLessons.map((l) => l.id) },
        },
      })
    : 0

  // Has the milestone already credited? Cheap idempotency check —
  // matches the (userId, milestoneKey) UNIQUE the API service writes.
  const milestoneKey = `phase_complete:${phase.id}`
  const awarded = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "LoyaltyMilestoneAchievement"
    WHERE "userId" = ${args.userId} AND "milestoneKey" = ${milestoneKey}
    LIMIT 1
  `

  return {
    phaseId: phase.id,
    phaseTitleEn: phase.titleEn,
    phaseTitleAr: phase.titleAr,
    phaseOrder: phase.order,
    totalLessons,
    completedLessons,
    alreadyAwarded: awarded.length > 0,
    awardPoints: PHASE_AWARD,
  }
}
