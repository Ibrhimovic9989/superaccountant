import 'server-only'
import { prisma } from '@sa/db'
import { createAutoPost } from './post-store'

/**
 * LMS → community bridge. When something worth celebrating happens on
 * the LMS side, call the matching hook here and the community feed
 * gets a `milestone` / `win` post with a link back to the achievement.
 *
 * Each hook is idempotent (the underlying insert is guarded by a
 * partial-UNIQUE index) and safe to call from any code path — the
 * assessment grader, a Supabase trigger, or a one-shot backfill.
 */

// ── grand-test pass ──────────────────────────────────────────

/**
 * Called from the grading pipeline the moment an AssessmentAttempt
 * of kind='grand' is marked graded with score >= 0.6. Non-blocking:
 * any failure is logged and swallowed so a broken community post
 * can't fail the grading flow.
 */
export async function onGrandTestPassed(attemptId: string): Promise<void> {
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string
        userId: string
        score: number | null
        trackId: string | null
      }>
    >(
      `SELECT
         a.id, a."userId", a.score,
         (SELECT le."trackId" FROM "LearningEnrollment" le
           WHERE le."userId" = a."userId" ORDER BY le."enrolledAt" DESC LIMIT 1) AS "trackId"
       FROM "AssessmentAttempt" a
      WHERE a.id = $1 AND a.kind = 'grand' AND a.status = 'graded'
      LIMIT 1`,
      attemptId,
    )
    const row = rows[0]
    if (!row || row.score == null || Number(row.score) < 0.6) return

    const pct = Math.round(Number(row.score) * 100)
    const trackLabel = row.trackId === 'ksa' ? "KSA Mu'tamad Path" : 'India Chartered Path'
    await createAutoPost({
      authorId: row.userId,
      kind: 'milestone',
      source: 'auto:grand-test-pass',
      body: `Just passed the SuperAccountant grand test — ${trackLabel} · ${pct}% mastery. Onwards.`,
      linkedEntityType: 'AssessmentAttempt',
      linkedEntityId: row.id,
      tags: ['grand-test', row.trackId ?? 'india'],
    })
  } catch (err) {
    console.error('[community/onGrandTestPassed] non-fatal error', {
      err: (err as Error).message,
      attemptId,
    })
  }
}

// ── cohort completed ─────────────────────────────────────────

export async function onCohortCompleted(enrollmentId: string): Promise<void> {
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ id: string; userId: string; trackId: string; completedAt: Date | null }>
    >(
      `SELECT id, "userId", "trackId", "completedAt"
         FROM "LearningEnrollment"
        WHERE id = $1 AND "completedAt" IS NOT NULL
        LIMIT 1`,
      enrollmentId,
    )
    const row = rows[0]
    if (!row) return
    const trackLabel = row.trackId === 'ksa' ? "KSA Mu'tamad Path" : 'India Chartered Path'
    await createAutoPost({
      authorId: row.userId,
      kind: 'milestone',
      source: 'auto:cohort-complete',
      body: `Completed the SuperAccountant ${trackLabel} cohort. Ready for what's next.`,
      linkedEntityType: 'LearningEnrollment',
      linkedEntityId: row.id,
      tags: ['cohort-complete', row.trackId],
    })
  } catch (err) {
    console.error('[community/onCohortCompleted] non-fatal error', {
      err: (err as Error).message,
      enrollmentId,
    })
  }
}
