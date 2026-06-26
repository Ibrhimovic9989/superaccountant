import 'server-only'
import { prisma } from '@sa/db'
import { unstable_cache } from 'next/cache'
import { reviveDates } from '@/lib/cache-revive'

/**
 * Learning-curve aggregation — pulls the before/after picture of a
 * student's journey through SuperAccountant in one go:
 *
 *   1. Identity      — name, email, market, enrolledAt
 *   2. Entry test    — initial score + the phase they were placed into
 *   3. Phase rollup  — per-phase total/completed/mastery
 *   4. Grand test    — final score + pass/fail
 *   5. Overall stats — average mastery, distinct active days
 *
 * Designed for the admin "recruiter handoff" PDF report. Heavy on raw
 * SQL where Prisma's API gets verbose (mastery aggregation). No cache —
 * this is admin-only, runs at most a handful of times per day.
 */

export type LearningCurvePhase = {
  phaseId: string
  order: number
  titleEn: string
  titleAr: string
  totalLessons: number
  completedLessons: number
  /** 0..1 — mean mastery across LessonProgress rows in this phase. */
  masteryAvg: number
  /** Latest lastReviewedAt for any lesson in this phase, if completed. */
  completedAt: Date | null
}

export type LearningCurve = {
  user: {
    id: string
    name: string
    email: string
    market: 'india' | 'ksa'
    enrolledAt: Date | null
  }
  entryTest: {
    score: number
    placedPhase: number
    takenAt: Date
  } | null
  phases: LearningCurvePhase[]
  grandTest: {
    score: number
    passed: boolean
    takenAt: Date
  } | null
  /** 0..1 — average mastery across every LearningProgress row. */
  overallMastery: number
  /** Distinct calendar days on which a LearningProgress row was last touched. */
  totalDaysActive: number
}

export type EnrolledStudentSummary = {
  userId: string
  name: string
  email: string
  market: 'india' | 'ksa'
  enrolledAt: Date | null
  /** Loosely: enrollment.completedAt is set OR grand test passed. */
  hasCompletedCohort: boolean
}

const GRAND_PASS_THRESHOLD = 0.6 // 60% — matches certificate-issuance heuristic

// ── Per-section fetchers (kept small to keep getLearningCurve readable) ──

async function fetchEntryTest(userId: string): Promise<LearningCurve['entryTest']> {
  // Prefer the canonical AssessmentAttempt row; fall back to EntryTestSession
  // for students who completed the test before AssessmentAttempt was wired up.
  const attemptRows = await prisma.$queryRaw<
    Array<{ score: number | null; gradedAt: Date | null; payload: unknown }>
  >`
    SELECT "score", "gradedAt", "payload"
    FROM "AssessmentAttempt"
    WHERE "userId" = ${userId} AND "kind" = 'entry' AND "status" = 'graded'
    ORDER BY COALESCE("gradedAt", "startedAt") DESC
    LIMIT 1
  `
  const a = attemptRows[0]
  if (a?.score != null && a.gradedAt) {
    const payload = a.payload as { placedPhase?: number } | null
    return {
      score: clamp01(a.score),
      placedPhase: payload?.placedPhase ?? 1,
      takenAt: a.gradedAt,
    }
  }
  const sessionRows = await prisma.$queryRaw<
    Array<{ score: number | null; placedPhase: number | null; completedAt: Date | null }>
  >`
    SELECT "score", "placedPhase", "completedAt"
    FROM "EntryTestSession"
    WHERE "userId" = ${userId} AND "completedAt" IS NOT NULL
    ORDER BY "completedAt" DESC
    LIMIT 1
  `
  const s = sessionRows[0]
  if (s?.score != null && s.completedAt) {
    return {
      score: clamp01(s.score),
      placedPhase: s.placedPhase ?? 1,
      takenAt: s.completedAt,
    }
  }
  return null
}

async function fetchGrandTest(userId: string): Promise<LearningCurve['grandTest']> {
  const rows = await prisma.$queryRaw<Array<{ score: number | null; gradedAt: Date | null }>>`
    SELECT "score", "gradedAt"
    FROM "AssessmentAttempt"
    WHERE "userId" = ${userId} AND "kind" = 'grand' AND "status" = 'graded'
    ORDER BY COALESCE("gradedAt", "startedAt") DESC
    LIMIT 1
  `
  const r = rows[0]
  if (r?.score == null || !r.gradedAt) return null
  const score = clamp01(r.score)
  return { score, passed: score >= GRAND_PASS_THRESHOLD, takenAt: r.gradedAt }
}

// ── Aggregate one student ─────────────────────────────────────

/**
 * Public entry — wrapped in unstable_cache (60s). The aggregate is the
 * heaviest read on the student-facing /my-progress page (~6 queries
 * including the per-phase join), and admin recruiter exports re-fetch the
 * same userId several times in a session. Cache invalidation hook:
 * `revalidateTag('curve:${userId}')` after grand-test grade.
 */
export async function getLearningCurve(userId: string): Promise<LearningCurve | null> {
  const cached = await unstable_cache(
    () => buildLearningCurve(userId),
    ['learning-curve', userId],
    { revalidate: 60, tags: [`curve:${userId}`] },
  )()
  return cached ? reviveDates(cached) : null
}

async function buildLearningCurve(userId: string): Promise<LearningCurve | null> {
  const userRows = await prisma.$queryRaw<
    Array<{ id: string; name: string | null; email: string; preferredTrack: string | null }>
  >`
    SELECT "id", "name", "email", "preferredTrack"::text AS "preferredTrack"
    FROM "IdentityUser"
    WHERE "id" = ${userId}
    LIMIT 1
  `
  const u = userRows[0]
  if (!u) return null
  const market: 'india' | 'ksa' = u.preferredTrack === 'ksa' ? 'ksa' : 'india'

  const enrollmentRows = await prisma.$queryRaw<Array<{ id: string; enrolledAt: Date }>>`
    SELECT "id", "enrolledAt"
    FROM "LearningEnrollment"
    WHERE "userId" = ${userId} AND "trackId" = ${market}
    ORDER BY "enrolledAt" ASC
    LIMIT 1
  `
  const enrollment = enrollmentRows[0] ?? null

  const entryTest = await fetchEntryTest(userId)

  // Phase rollup — one query joins phase→module→lesson→progress and
  // groups so we don't N+1 per phase.
  type PhaseRow = {
    phaseId: string
    order: number
    titleEn: string
    titleAr: string
    totalLessons: number
    completedLessons: number
    masterySum: number
    masteryCount: number
    lastReviewedAt: Date | null
  }
  const phaseRows = await prisma.$queryRaw<PhaseRow[]>`
    SELECT
      p."id"        AS "phaseId",
      p."order"     AS "order",
      p."titleEn"   AS "titleEn",
      p."titleAr"   AS "titleAr",
      COUNT(DISTINCT l."id")::int AS "totalLessons",
      COUNT(DISTINCT lp."lessonId") FILTER (WHERE lp."mastery" >= 0.75)::int AS "completedLessons",
      COALESCE(SUM(lp."mastery"), 0)::float AS "masterySum",
      COUNT(lp."id")::int AS "masteryCount",
      MAX(lp."lastReviewedAt") AS "lastReviewedAt"
    FROM "CurriculumPhase" p
    JOIN "CurriculumTrack" t   ON t."id"  = p."trackId"
    JOIN "CurriculumModule" m  ON m."phaseId" = p."id"
    JOIN "CurriculumLesson" l  ON l."moduleId" = m."id"
    LEFT JOIN "LearningEnrollment" e
           ON e."userId" = ${userId} AND e."trackId" = ${market}
    LEFT JOIN "LearningProgress" lp
           ON lp."enrollmentId" = e."id" AND lp."lessonId" = l."id"
    WHERE t."market"::text = ${market}
    GROUP BY p."id", p."order", p."titleEn", p."titleAr"
    ORDER BY p."order" ASC
  `

  const phases: LearningCurvePhase[] = phaseRows.map((r) => {
    const masteryAvg = r.masteryCount > 0 ? r.masterySum / r.masteryCount : 0
    const fullyDone = r.totalLessons > 0 && r.completedLessons >= r.totalLessons
    return {
      phaseId: r.phaseId,
      order: r.order,
      titleEn: r.titleEn,
      titleAr: r.titleAr,
      totalLessons: r.totalLessons,
      completedLessons: r.completedLessons,
      masteryAvg: clamp01(masteryAvg),
      completedAt: fullyDone ? r.lastReviewedAt : null,
    }
  })

  const grandTest = await fetchGrandTest(userId)

  // Overall mastery + active days — one summary query.
  const summaryRows = await prisma.$queryRaw<
    Array<{ overallMastery: number | null; totalDaysActive: number }>
  >`
    SELECT
      AVG(lp."mastery")::float AS "overallMastery",
      COUNT(DISTINCT DATE(lp."updatedAt"))::int AS "totalDaysActive"
    FROM "LearningProgress" lp
    JOIN "LearningEnrollment" e ON e."id" = lp."enrollmentId"
    WHERE e."userId" = ${userId} AND e."trackId" = ${market}
  `
  const summary = summaryRows[0]
  const overallMastery = clamp01(summary?.overallMastery ?? 0)
  const totalDaysActive = summary?.totalDaysActive ?? 0

  return {
    user: {
      id: u.id,
      name: u.name ?? '—',
      email: u.email,
      market,
      enrolledAt: enrollment?.enrolledAt ?? null,
    },
    entryTest,
    phases,
    grandTest,
    overallMastery,
    totalDaysActive,
  }
}

// ── List enrolled students for the admin index ────────────────

export async function listEnrolledStudents(
  filters: { market?: 'india' | 'ksa' } = {},
): Promise<EnrolledStudentSummary[]> {
  // "Enrolled" = has any paid CohortApplication. We grab the most recent
  // paid app per user so a student who paid twice doesn't double-count.
  type Row = {
    userId: string
    name: string | null
    email: string
    preferredTrack: string | null
    cohortTrack: string
    paidAt: Date | null
    completedAt: Date | null
  }
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT DISTINCT ON (u."id")
      u."id"             AS "userId",
      u."name"           AS "name",
      u."email"          AS "email",
      u."preferredTrack"::text AS "preferredTrack",
      c."track"          AS "cohortTrack",
      a."paidAt"         AS "paidAt",
      e."completedAt"    AS "completedAt"
    FROM "CohortApplication" a
    JOIN "Cohort" c ON c."id" = a."cohortId"
    JOIN "IdentityUser" u ON LOWER(u."email") = a."email"
    LEFT JOIN "LearningEnrollment" e
           ON e."userId" = u."id" AND e."trackId" = c."track"
    WHERE a."status" = 'paid'
    ORDER BY u."id", a."paidAt" DESC NULLS LAST
  `

  const summaries: EnrolledStudentSummary[] = []
  for (const r of rows) {
    const market: 'india' | 'ksa' =
      r.cohortTrack === 'ksa' || r.preferredTrack === 'ksa' ? 'ksa' : 'india'
    if (filters.market && filters.market !== market) continue
    summaries.push({
      userId: r.userId,
      name: r.name ?? r.email.split('@')[0] ?? '—',
      email: r.email,
      market,
      enrolledAt: r.paidAt,
      hasCompletedCohort: r.completedAt != null,
    })
  }
  // Sort newest-enrolled first; nulls last
  summaries.sort((a, b) => {
    const at = a.enrolledAt ? a.enrolledAt.getTime() : -1
    const bt = b.enrolledAt ? b.enrolledAt.getTime() : -1
    return bt - at
  })
  return summaries
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}
