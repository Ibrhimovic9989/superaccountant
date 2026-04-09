import { prisma } from '@sa/db'

/**
 * Full curriculum roadmap for a student — phases, modules, lessons, progress.
 * Powers the /roadmap page.
 */

export type RoadmapLesson = {
  slug: string
  titleEn: string
  titleAr: string
  mastery: number // 0–1, 0 if never attempted
  completed: boolean
}

export type RoadmapModule = {
  titleEn: string
  titleAr: string
  order: number
  lessons: RoadmapLesson[]
  completedCount: number
  totalCount: number
}

export type RoadmapPhase = {
  order: number
  titleEn: string
  titleAr: string
  modules: RoadmapModule[]
  completedCount: number
  totalCount: number
}

export type RoadmapData = {
  phases: RoadmapPhase[]
  totalLessons: number
  completedLessons: number
  estimatedWeeksLeft: number | null // null if studyHoursPerWeek not set
  targetExamDate: Date | null
}

export async function getRoadmap(
  userId: string,
  market: 'india' | 'ksa',
): Promise<RoadmapData> {
  // 1. Get all lessons with their phase + module hierarchy for this track.
  const lessons = await prisma.$queryRaw<
    {
      slug: string
      titleEn: string
      titleAr: string
      phaseOrder: number
      phaseTitleEn: string
      phaseTitleAr: string
      moduleOrder: number
      moduleTitleEn: string
      moduleTitleAr: string
    }[]
  >`
    SELECT
      l."slug",
      l."titleEn",
      COALESCE(l."titleAr", l."titleEn") as "titleAr",
      p."order" as "phaseOrder",
      p."titleEn" as "phaseTitleEn",
      p."titleAr" as "phaseTitleAr",
      m."order" as "moduleOrder",
      m."titleEn" as "moduleTitleEn",
      COALESCE(m."titleAr", m."titleEn") as "moduleTitleAr"
    FROM "CurriculumLesson" l
    JOIN "CurriculumModule" m ON l."moduleId" = m.id
    JOIN "CurriculumPhase" p ON m."phaseId" = p.id
    JOIN "CurriculumTrack" t ON p."trackId" = t.id
    WHERE t.market::text = ${market}
    ORDER BY p."order", m."order", l."order"
  `

  // 2. Get mastery for each lesson this student has attempted.
  // LearningProgress links to the user via LearningEnrollment.
  // lessonId is a cuid FK to CurriculumLesson.id — join to get the slug.
  const progress = await prisma.$queryRaw<
    { lessonSlug: string; mastery: number }[]
  >`
    SELECT
      cl."slug" as "lessonSlug",
      lp."mastery"
    FROM "LearningProgress" lp
    JOIN "LearningEnrollment" le ON lp."enrollmentId" = le.id
    JOIN "CurriculumLesson" cl ON lp."lessonId" = cl.id
    WHERE le."userId" = ${userId}
  `
  const masteryMap = new Map(
    progress.map((p) => [
      p.lessonSlug,
      { mastery: Number(p.mastery), completed: Number(p.mastery) >= 0.7 },
    ]),
  )

  // 3. Get student profile for estimation.
  const profileRows = await prisma.$queryRaw<
    { studyHoursPerWeek: number | null; targetExamDate: Date | null }[]
  >`
    SELECT "studyHoursPerWeek", "targetExamDate"
    FROM "IdentityUser"
    WHERE id = ${userId}
    LIMIT 1
  `
  const profile = profileRows[0]

  // 4. Build the tree.
  const phaseMap = new Map<number, RoadmapPhase>()

  for (const row of lessons) {
    let phase = phaseMap.get(row.phaseOrder)
    if (!phase) {
      phase = {
        order: row.phaseOrder,
        titleEn: row.phaseTitleEn,
        titleAr: row.phaseTitleAr,
        modules: [],
        completedCount: 0,
        totalCount: 0,
      }
      phaseMap.set(row.phaseOrder, phase)
    }

    let mod = phase.modules.find(
      (m) => m.order === row.moduleOrder && m.titleEn === row.moduleTitleEn,
    )
    if (!mod) {
      mod = {
        titleEn: row.moduleTitleEn,
        titleAr: row.moduleTitleAr,
        order: row.moduleOrder,
        lessons: [],
        completedCount: 0,
        totalCount: 0,
      }
      phase.modules.push(mod)
    }

    const p = masteryMap.get(row.slug)
    const lesson: RoadmapLesson = {
      slug: row.slug,
      titleEn: row.titleEn,
      titleAr: row.titleAr,
      mastery: p ? Number(p.mastery) : 0,
      completed: p?.completed ?? false,
    }
    mod.lessons.push(lesson)
    mod.totalCount++
    if (lesson.completed) mod.completedCount++
  }

  // Roll up counts.
  const phases = Array.from(phaseMap.values()).sort((a, b) => a.order - b.order)
  let totalLessons = 0
  let completedLessons = 0
  for (const phase of phases) {
    for (const mod of phase.modules) {
      phase.totalCount += mod.totalCount
      phase.completedCount += mod.completedCount
    }
    totalLessons += phase.totalCount
    completedLessons += phase.completedCount
  }

  // 5. Estimate weeks left.
  const remaining = totalLessons - completedLessons
  const hoursPerLesson = 0.5 // ~30 min per lesson average
  const hoursLeft = remaining * hoursPerLesson
  const estimatedWeeksLeft =
    profile?.studyHoursPerWeek && profile.studyHoursPerWeek > 0
      ? Math.ceil(hoursLeft / profile.studyHoursPerWeek)
      : null

  return {
    phases,
    totalLessons,
    completedLessons,
    estimatedWeeksLeft,
    targetExamDate: profile?.targetExamDate ?? null,
  }
}
