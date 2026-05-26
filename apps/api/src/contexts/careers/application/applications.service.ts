/**
 * ApplicationsService — candidates apply to jobs; companies manage the
 * pipeline. The interesting part is the apply gate.
 *
 * Apply gate (locked spec):
 *   - User must have a PAID CohortApplication (any track).
 *   - User must have a PASSED AssessmentAttempt of kind 'grand'
 *     (score ≥ 0.7).
 *   - Job must be 'open' AND the company must be 'approved'.
 *
 * At apply time we snapshot two candidate-context fields onto
 * JobApplication so the company sees stable values even if the
 * candidate later edits their profile / takes another grand test:
 *   candidateGrandTestScore — best score across all passing attempts
 *   candidateCohortPhase    — highest phase fully completed
 *                             (1..N, or 0 if no full phase yet)
 */

import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { prisma } from '@sa/db'
import type { ApplicationStatus, Job, JobApplication } from '../domain/types'

const APPLICATION_COLUMNS = `
  "id", "jobId", "candidateUserId", "resumeUrl", "resumeFilename",
  "coverLetter", "candidateName", "candidateEmail", "candidatePhone",
  "candidateGrandTestScore", "candidateCohortPhase",
  "status", "statusReason", "createdAt", "updatedAt"
`

export type ApplyError =
  | { code: 'not_enrolled' }
  | { code: 'grand_test_not_passed' }
  | { code: 'job_not_open' }
  | { code: 'already_applied'; applicationId: string }

@Injectable()
export class ApplicationsService {
  async apply(input: {
    userId: string
    jobId: string
    resumeUrl: string
    resumeFilename?: string | null
    coverLetter?: string | null
  }): Promise<{ ok: true; application: JobApplication } | { ok: false; error: ApplyError }> {
    // 0. Resolve the job + verify it's openly accepting applications.
    const job = await this.fetchOpenJobForApply(input.jobId)
    if (!job) return { ok: false, error: { code: 'job_not_open' } }

    // 1. Resolve the candidate's IdentityUser + profile fields.
    const user = await prisma.identityUser.findUnique({
      where: { id: input.userId },
      select: { id: true, name: true, email: true, phone: true, preferredTrack: true },
    })
    if (!user) return { ok: false, error: { code: 'not_enrolled' } }

    // 2. Apply gate: paid cohort + passing grand-test.
    const enrolled = await this.isPaidCohortEnrolled(user.email)
    if (!enrolled) return { ok: false, error: { code: 'not_enrolled' } }

    const grandTestScore = await this.bestGrandTestScore(user.id)
    if (grandTestScore === null) {
      return { ok: false, error: { code: 'grand_test_not_passed' } }
    }

    // 3. Idempotency check on (jobId, candidateUserId).
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "JobApplication"
      WHERE "jobId" = ${input.jobId} AND "candidateUserId" = ${input.userId}
      LIMIT 1
    `
    if (existing[0]) {
      return { ok: false, error: { code: 'already_applied', applicationId: existing[0].id } }
    }

    // 4. Compute cohort phase snapshot.
    const cohortPhase = user.preferredTrack
      ? await this.computeCohortPhase(user.id, user.preferredTrack)
      : 0

    // 5. Insert.
    const id = randomUUID()
    try {
      await prisma.$executeRaw`
        INSERT INTO "JobApplication" (
          "id", "jobId", "candidateUserId",
          "resumeUrl", "resumeFilename", "coverLetter",
          "candidateName", "candidateEmail", "candidatePhone",
          "candidateGrandTestScore", "candidateCohortPhase",
          "status"
        ) VALUES (
          ${id}, ${input.jobId}, ${input.userId},
          ${input.resumeUrl}, ${input.resumeFilename ?? null}, ${input.coverLetter ?? null},
          ${user.name ?? user.email}, ${user.email}, ${user.phone ?? null},
          ${grandTestScore}, ${cohortPhase},
          'submitted'
        )
      `
    } catch (e) {
      // Race: another submission won the UNIQUE — re-read and return it.
      const msg = (e as Error).message ?? ''
      if (msg.includes('23505') || /unique/i.test(msg)) {
        const winner = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "JobApplication"
          WHERE "jobId" = ${input.jobId} AND "candidateUserId" = ${input.userId}
          LIMIT 1
        `
        if (winner[0]) {
          return { ok: false, error: { code: 'already_applied', applicationId: winner[0].id } }
        }
      }
      throw e
    }

    const application = (await this.getById(id))!
    return { ok: true, application }
  }

  // ── Reads ───────────────────────────────────────────────────

  async getById(id: string): Promise<JobApplication | null> {
    const rows = await prisma.$queryRawUnsafe<JobApplication[]>(
      `SELECT ${APPLICATION_COLUMNS} FROM "JobApplication" WHERE "id" = $1 LIMIT 1`,
      id,
    )
    return rows[0] ?? null
  }

  /**
   * For the HR dashboard. Caller is expected to verify the requesting
   * user belongs to the job's company — done in the controller layer.
   */
  async listForJob(jobId: string, status?: ApplicationStatus): Promise<JobApplication[]> {
    if (status) {
      return prisma.$queryRawUnsafe<JobApplication[]>(
        `SELECT ${APPLICATION_COLUMNS} FROM "JobApplication"
         WHERE "jobId" = $1 AND "status" = $2
         ORDER BY "createdAt" DESC`,
        jobId,
        status,
      )
    }
    return prisma.$queryRawUnsafe<JobApplication[]>(
      `SELECT ${APPLICATION_COLUMNS} FROM "JobApplication"
       WHERE "jobId" = $1
       ORDER BY "createdAt" DESC`,
      jobId,
    )
  }

  /** "What have I applied to?" — for the candidate's own dashboard. */
  async listForCandidate(userId: string): Promise<JobApplication[]> {
    return prisma.$queryRawUnsafe<JobApplication[]>(
      `SELECT ${APPLICATION_COLUMNS} FROM "JobApplication"
       WHERE "candidateUserId" = $1
       ORDER BY "createdAt" DESC`,
      userId,
    )
  }

  // ── Status mutation (HR side) ──────────────────────────────

  async updateStatus(args: {
    applicationId: string
    nextStatus: ApplicationStatus
    reason?: string | null
  }): Promise<JobApplication> {
    await prisma.$executeRaw`
      UPDATE "JobApplication"
      SET "status" = ${args.nextStatus}::text,
          "statusReason" = ${args.reason ?? null},
          "updatedAt" = NOW()
      WHERE "id" = ${args.applicationId}
    `
    const app = await this.getById(args.applicationId)
    if (!app) throw new Error(`Application not found: ${args.applicationId}`)
    return app
  }

  // ── Apply-gate helpers ──────────────────────────────────────

  private async fetchOpenJobForApply(jobId: string): Promise<Job | null> {
    const rows = await prisma.$queryRawUnsafe<Job[]>(
      `SELECT j.*
       FROM "Job" j
       JOIN "Company" c ON c."id" = j."companyId"
       WHERE j."id" = $1
         AND j."status" = 'open'
         AND c."status" = 'approved'
       LIMIT 1`,
      jobId,
    )
    return rows[0] ?? null
  }

  private async isPaidCohortEnrolled(email: string): Promise<boolean> {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "CohortApplication"
      WHERE LOWER("email") = LOWER(${email})
        AND "status" = 'paid'
      LIMIT 1
    `
    return rows.length > 0
  }

  /** Returns the best passing grand-test score for the user, or null. */
  private async bestGrandTestScore(userId: string): Promise<number | null> {
    const best = await prisma.assessmentAttempt.findFirst({
      where: { userId, kind: 'grand', status: 'graded', score: { gte: 0.7 } },
      orderBy: { score: 'desc' },
      select: { score: true },
    })
    return best?.score ?? null
  }

  /**
   * Highest phase the user has FULLY completed (1..N). 0 if they
   * haven't finished any phase yet. Stops at the first incomplete
   * phase — assumes phases are linear.
   */
  private async computeCohortPhase(userId: string, market: 'india' | 'ksa'): Promise<number> {
    const enrollment = await prisma.learningEnrollment.findFirst({
      where: { userId, trackId: market },
      select: { id: true },
    })
    if (!enrollment) return 0

    const phases = await prisma.curriculumPhase.findMany({
      where: { track: { market } },
      orderBy: { order: 'asc' },
      select: {
        order: true,
        modules: { select: { lessons: { select: { id: true } } } },
      },
    })

    let maxComplete = 0
    for (const phase of phases) {
      const lessonIds = phase.modules.flatMap((m) => m.lessons.map((l) => l.id))
      if (lessonIds.length === 0) continue
      const completedCount = await prisma.learningProgress.count({
        where: { enrollmentId: enrollment.id, lessonId: { in: lessonIds } },
      })
      if (completedCount >= lessonIds.length) {
        maxComplete = phase.order
      } else {
        break
      }
    }
    return maxComplete
  }
}
