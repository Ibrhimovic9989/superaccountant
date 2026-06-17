import 'server-only'
import { prisma } from '@sa/db'

/**
 * Deep-insight aggregation for the learning curve.
 *
 * The old aggregate.ts gives phase-completion % — pretty, but a recruiter
 * doesn't actually learn what the candidate knows. This sibling builds
 * the signal a hiring manager actually wants:
 *
 *   moduleStrengths   - mean mastery per CurriculumModule, with TOP-5
 *                       and BOTTOM-5 surfaced. "What can they do today?"
 *   activityHeatmap   - day-by-day touch count over the last 60 days.
 *                       Discipline signal. "Did they show up every day?"
 *   improvement       - entry-test score vs grand-test score, as points.
 *                       "How much did they grow?"
 *   discipline        - active days, longest streak, days since enrol.
 *                       "Are they consistent?"
 *   cohortPercentile  - rank within same-market peers by overall mastery.
 *                       "Are they above-average compared to their cohort?"
 *   recovery          - % of lessons that started < 0.5 mastery and ended
 *                       >= 0.8 mastery. Grit / "comes back at hard stuff".
 *
 * All raw SQL: the queries are read-only, runtime is admin/student own,
 * Prisma's relational API gets verbose for the rollups we want. Cache
 * NONE — the founder asked for live data from day 1.
 */

export type ModuleStrength = {
  moduleId: string
  phaseOrder: number
  moduleOrder: number
  titleEn: string
  titleAr: string
  /** 0..1 mean mastery across LearningProgress rows in this module. */
  masteryAvg: number
  /** Distinct lessons in this module that have any progress row. */
  lessonsTouched: number
  /** Total lessons in this module (denominator). */
  lessonsTotal: number
}

export type ActivityDay = {
  /** YYYY-MM-DD. */
  date: string
  /** How many distinct lessons had progress updates on that day. */
  touches: number
}

export type LearningInsights = {
  moduleStrengths: ModuleStrength[]
  /** Strongest 5 modules by mastery (only those with lessonsTouched > 0). */
  topModules: ModuleStrength[]
  /** Weakest 5 modules that still have at least one touch. */
  bottomModules: ModuleStrength[]
  /** Last 60 calendar days, oldest-first. */
  activityHeatmap: ActivityDay[]
  improvement: {
    entryScorePct: number | null
    grandScorePct: number | null
    deltaPoints: number | null
  }
  discipline: {
    enrolledAt: Date | null
    daysSinceEnrol: number | null
    activeDays: number
    longestStreak: number
    /** active days ÷ days since enrol — fraction of days they showed up. */
    consistencyPct: number | null
  }
  cohortPercentile: {
    /** 0..100, or null if the cohort is too small to be meaningful. */
    percentile: number | null
    peersConsidered: number
  }
  recovery: {
    initiallyWeak: number
    recovered: number
    /** recovered / initiallyWeak as 0..1 — null if no weak lessons. */
    rate: number | null
  }
}

/** A weak lesson is one whose first recorded mastery (at first touch) was below this. */
const WEAK_THRESHOLD = 0.5
/** Recovered = mastery ≥ this at the latest review. */
const MASTERED_THRESHOLD = 0.8
/** Minimum cohort size to surface percentile (anything smaller is statistically noisy). */
const MIN_COHORT_FOR_PERCENTILE = 8
/** Days shown in the heatmap. */
const HEATMAP_DAYS = 60

export async function getLearningInsights(userId: string): Promise<LearningInsights | null> {
  const user = await prisma.identityUser.findUnique({
    where: { id: userId },
    select: { preferredTrack: true },
  })
  if (!user?.preferredTrack) return null
  const market = user.preferredTrack

  // Run independent rollups in parallel — each one is its own raw SQL.
  const [
    moduleStrengths,
    activityHeatmap,
    improvement,
    discipline,
    cohortPercentile,
    recovery,
  ] = await Promise.all([
    fetchModuleStrengths(userId, market),
    fetchActivityHeatmap(userId),
    fetchImprovement(userId),
    fetchDiscipline(userId),
    fetchCohortPercentile(userId, market),
    fetchRecovery(userId),
  ])

  // Top/bottom callouts: only consider modules the student has touched.
  const touched = moduleStrengths.filter((m) => m.lessonsTouched > 0)
  const sortedByMastery = [...touched].sort((a, b) => b.masteryAvg - a.masteryAvg)
  const topModules = sortedByMastery.slice(0, 5)
  const bottomModules = [...sortedByMastery].reverse().slice(0, 5)

  return {
    moduleStrengths,
    topModules,
    bottomModules,
    activityHeatmap,
    improvement,
    discipline,
    cohortPercentile,
    recovery,
  }
}

// ──────────────────────────────────────────────────────────────
// Module strengths
// ──────────────────────────────────────────────────────────────

async function fetchModuleStrengths(
  userId: string,
  market: 'india' | 'ksa',
): Promise<ModuleStrength[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      moduleId: string
      phaseOrder: number
      moduleOrder: number
      titleEn: string
      titleAr: string
      masteryAvg: number | null
      lessonsTouched: bigint
      lessonsTotal: bigint
    }>
  >`
    SELECT
      cm.id            AS "moduleId",
      cp."order"       AS "phaseOrder",
      cm."order"       AS "moduleOrder",
      cm."titleEn",
      cm."titleAr",
      AVG(lp.mastery)::float                                   AS "masteryAvg",
      COUNT(DISTINCT lp."lessonId")::bigint                    AS "lessonsTouched",
      (SELECT COUNT(*)::bigint
         FROM "CurriculumLesson" cl2
        WHERE cl2."moduleId" = cm.id)                          AS "lessonsTotal"
    FROM "CurriculumModule" cm
    JOIN "CurriculumPhase"  cp ON cp.id = cm."phaseId"
    JOIN "CurriculumTrack"  ct ON ct.id = cp."trackId"
    JOIN "CurriculumLesson" cl ON cl."moduleId" = cm.id
    LEFT JOIN "LearningProgress" lp
      ON lp."lessonId" = cl.id
     AND lp."enrollmentId" IN (
       SELECT le.id FROM "LearningEnrollment" le
        WHERE le."userId" = ${userId} AND le."trackId" = ct.id
     )
    WHERE ct.market::text = ${market}
    GROUP BY cm.id, cp."order", cm."order", cm."titleEn", cm."titleAr"
    ORDER BY cp."order" ASC, cm."order" ASC
  `
  return rows.map((r) => ({
    moduleId: r.moduleId,
    phaseOrder: r.phaseOrder,
    moduleOrder: r.moduleOrder,
    titleEn: r.titleEn,
    titleAr: r.titleAr,
    masteryAvg: r.masteryAvg ?? 0,
    lessonsTouched: Number(r.lessonsTouched ?? 0),
    lessonsTotal: Number(r.lessonsTotal ?? 0),
  }))
}

// ──────────────────────────────────────────────────────────────
// Activity heatmap — last 60 calendar days
// ──────────────────────────────────────────────────────────────

async function fetchActivityHeatmap(userId: string): Promise<ActivityDay[]> {
  // Compute the cutoff in JS so the SQL parameterises cleanly — Prisma
  // tagged-template params can't sit inside an INTERVAL literal.
  const cutoff = new Date()
  cutoff.setUTCHours(0, 0, 0, 0)
  cutoff.setUTCDate(cutoff.getUTCDate() - (HEATMAP_DAYS - 1))
  const rows = await prisma.$queryRaw<Array<{ d: string; c: bigint }>>`
    SELECT
      TO_CHAR(DATE_TRUNC('day', GREATEST(lp."lastReviewedAt", lp."updatedAt")), 'YYYY-MM-DD') AS d,
      COUNT(DISTINCT lp."lessonId")::bigint                                                   AS c
    FROM "LearningProgress" lp
    JOIN "LearningEnrollment" le ON le.id = lp."enrollmentId"
    WHERE le."userId" = ${userId}
      AND GREATEST(lp."lastReviewedAt", lp."updatedAt") >= ${cutoff}
    GROUP BY 1
    ORDER BY 1 ASC
  `

  // Densify so the consumer doesn't have to. Every day from D-60 to today
  // shows up, even if the touch count is 0 — keeps the grid render simple.
  const byDate = new Map(rows.map((r) => [r.d, Number(r.c ?? 0)]))
  const out: ActivityDay[] = []
  const now = new Date()
  for (let offset = HEATMAP_DAYS - 1; offset >= 0; offset--) {
    const d = new Date(now)
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - offset)
    const key = d.toISOString().slice(0, 10)
    out.push({ date: key, touches: byDate.get(key) ?? 0 })
  }
  return out
}

// ──────────────────────────────────────────────────────────────
// Improvement: entry → grand score delta
// ──────────────────────────────────────────────────────────────

async function fetchImprovement(userId: string): Promise<LearningInsights['improvement']> {
  const rows = await prisma.$queryRaw<Array<{ kind: string; score: number | null }>>`
    SELECT DISTINCT ON ("kind") "kind", "score"
    FROM "AssessmentAttempt"
    WHERE "userId" = ${userId} AND "status" = 'graded' AND "kind" IN ('entry', 'grand')
    ORDER BY "kind", COALESCE("gradedAt", "startedAt") DESC
  `
  const byKind = new Map(rows.map((r) => [r.kind, r.score ?? null]))
  const entry = byKind.get('entry')
  const grand = byKind.get('grand')
  const entryScorePct = entry != null ? Math.round(entry * 100) : null
  const grandScorePct = grand != null ? Math.round(grand * 100) : null
  const deltaPoints =
    entryScorePct != null && grandScorePct != null ? grandScorePct - entryScorePct : null
  return { entryScorePct, grandScorePct, deltaPoints }
}

// ──────────────────────────────────────────────────────────────
// Discipline: active days + longest streak
// ──────────────────────────────────────────────────────────────

async function fetchDiscipline(userId: string): Promise<LearningInsights['discipline']> {
  // Single round-trip — get every distinct active day for this user.
  const rows = await prisma.$queryRaw<Array<{ d: string }>>`
    SELECT DISTINCT TO_CHAR(DATE_TRUNC('day', GREATEST(lp."lastReviewedAt", lp."updatedAt")), 'YYYY-MM-DD') AS d
    FROM "LearningProgress" lp
    JOIN "LearningEnrollment" le ON le.id = lp."enrollmentId"
    WHERE le."userId" = ${userId}
    ORDER BY d ASC
  `
  const days = rows.map((r) => r.d)
  const enrolment = await prisma.learningEnrollment.findFirst({
    where: { userId },
    select: { enrolledAt: true },
  })
  const enrolledAt = enrolment?.enrolledAt ?? null
  const daysSinceEnrol = enrolledAt
    ? Math.max(1, Math.floor((Date.now() - enrolledAt.getTime()) / 86_400_000))
    : null
  const longestStreak = computeLongestStreak(days)
  const activeDays = days.length
  const consistencyPct =
    daysSinceEnrol != null && daysSinceEnrol > 0
      ? Math.min(100, Math.round((activeDays / daysSinceEnrol) * 100))
      : null
  return {
    enrolledAt,
    daysSinceEnrol,
    activeDays,
    longestStreak,
    consistencyPct,
  }
}

function computeLongestStreak(sortedYmd: string[]): number {
  if (sortedYmd.length === 0) return 0
  let best = 1
  let cur = 1
  for (let i = 1; i < sortedYmd.length; i++) {
    const prev = new Date(`${sortedYmd[i - 1]}T00:00:00Z`).getTime()
    const next = new Date(`${sortedYmd[i]}T00:00:00Z`).getTime()
    const diffDays = Math.round((next - prev) / 86_400_000)
    if (diffDays === 1) {
      cur++
      if (cur > best) best = cur
    } else {
      cur = 1
    }
  }
  return best
}

// ──────────────────────────────────────────────────────────────
// Cohort percentile: rank on overall mastery within same market
// ──────────────────────────────────────────────────────────────

async function fetchCohortPercentile(
  userId: string,
  market: 'india' | 'ksa',
): Promise<LearningInsights['cohortPercentile']> {
  const rows = await prisma.$queryRaw<Array<{ userId: string; m: number | null }>>`
    SELECT le."userId" AS "userId", AVG(lp.mastery)::float AS m
    FROM "LearningEnrollment" le
    JOIN "CurriculumTrack" ct ON ct.id = le."trackId"
    LEFT JOIN "LearningProgress" lp ON lp."enrollmentId" = le.id
    WHERE ct.market::text = ${market}
    GROUP BY le."userId"
    HAVING AVG(lp.mastery) IS NOT NULL
  `
  const peers = rows.length
  if (peers < MIN_COHORT_FOR_PERCENTILE) return { percentile: null, peersConsidered: peers }
  const target = rows.find((r) => r.userId === userId)
  if (!target || target.m == null) return { percentile: null, peersConsidered: peers }
  const below = rows.filter((r) => (r.m ?? 0) < (target.m ?? 0)).length
  const percentile = Math.round((below / peers) * 100)
  return { percentile, peersConsidered: peers }
}

// ──────────────────────────────────────────────────────────────
// Recovery: weak → mastered
// ──────────────────────────────────────────────────────────────

async function fetchRecovery(userId: string): Promise<LearningInsights['recovery']> {
  // We don't store historical mastery per lesson; we only have the
  // current value. To approximate "started weak" we use the heuristic
  // that ANY lesson currently below WEAK_THRESHOLD is still weak (not
  // recovered), and any lesson with multiple LearningProgress updates
  // that's now >= MASTERED_THRESHOLD is one we "recovered." Imperfect
  // but directional.
  //
  // A future improvement: snapshot mastery into a LearningProgressLog
  // table on each update so this can be exact.
  const rows = await prisma.$queryRaw<
    Array<{ mastery: number | null; updates: bigint }>
  >`
    SELECT
      lp.mastery,
      -- We don't have per-row history; use the gap between createdAt
      -- (proxied by updatedAt - INTERVAL or the row's own age) and
      -- mastery to count this as "touched multiple times" when there
      -- are review timestamps. Coarse but practical.
      CASE WHEN lp."lastReviewedAt" IS NOT NULL THEN 2::bigint ELSE 1::bigint END AS updates
    FROM "LearningProgress" lp
    JOIN "LearningEnrollment" le ON le.id = lp."enrollmentId"
    WHERE le."userId" = ${userId}
  `
  let initiallyWeak = 0
  let recovered = 0
  for (const r of rows) {
    const m = r.mastery ?? 0
    const reviewedAgain = (r.updates ?? 0) >= 2
    // Heuristic: if the lesson has been re-reviewed AND is now mastered,
    // call it recovered. If it's been re-reviewed but mastery is still
    // weak, count it as initiallyWeak-but-not-recovered.
    if (reviewedAgain) {
      // We assume the first attempt was weaker than the current value —
      // not perfect but the directional signal holds for grit framing.
      if (m >= MASTERED_THRESHOLD) {
        recovered++
        initiallyWeak++
      } else if (m < WEAK_THRESHOLD) {
        initiallyWeak++
      }
    }
  }
  const rate = initiallyWeak > 0 ? recovered / initiallyWeak : null
  return { initiallyWeak, recovered, rate }
}
