/**
 * MarkCompleteService — records that a student finished a lesson, updates
 * their mastery score, and (if needed) creates the LearningEnrollment row.
 *
 * Mastery is computed from the supplied answer payload:
 *   - MCQs grade locally on the client; client sends correct/total count.
 *   - Short-answer / scenario items aren't required for "complete" (the
 *     student can mark complete after answering MCQs only). They contribute
 *     to mastery only if a verdict was already produced by assess_answer.
 *
 * Mastery formula: weighted average of (correctCount / totalGraded), capped
 * at 1.0. Spaced-repetition due-date is set 7 days out on first completion,
 * doubling on each subsequent revisit (Leitner-style).
 */

import { Inject, Injectable } from '@nestjs/common'
import { prisma } from '@sa/db'
import { LoyaltyService } from '../../loyalty/application/loyalty.service'
import { LOYALTY_SERVICE } from '../../loyalty/interface/loyalty.controller'

export type CompleteArgs = {
  userId: string
  lessonSlug: string
  /** number of MCQs the student answered correctly */
  mcqCorrect: number
  /** total MCQs (or 0 if no MCQs). */
  mcqTotal: number
  /** Optional grader scores from assess_answer for short-answer items, 0..1 each. */
  shortAnswerScores?: number[]
}

export type CompleteResult = {
  ok: true
  lessonId: string
  mastery: number
  reviewedAt: string
  nextDueAt: string
  isFirstCompletion: boolean
}

@Injectable()
export class MarkCompleteService {
  constructor(@Inject(LOYALTY_SERVICE) private readonly loyalty: LoyaltyService) {}

  async execute(args: CompleteArgs): Promise<CompleteResult> {
    const lesson = await prisma.curriculumLesson.findUnique({
      where: { slug: args.lessonSlug },
      include: { module: { include: { phase: { include: { track: true } } } } },
    })
    if (!lesson) throw new Error(`unknown lesson: ${args.lessonSlug}`)

    const market = lesson.module.phase.track.market

    // Compute mastery: equal weight on MCQ% and short-answer mean (if any).
    const mcqRatio = args.mcqTotal > 0 ? args.mcqCorrect / args.mcqTotal : 1
    const saMean =
      args.shortAnswerScores && args.shortAnswerScores.length > 0
        ? args.shortAnswerScores.reduce((a, b) => a + b, 0) / args.shortAnswerScores.length
        : null
    const mastery = saMean !== null ? (mcqRatio + saMean) / 2 : mcqRatio

    // Ensure enrollment exists.
    let enrollment = await prisma.learningEnrollment.findFirst({
      where: { userId: args.userId, trackId: market },
    })
    if (!enrollment) {
      // The trackId column on LearningEnrollment stores a free-form id; we use
      // the market string for v1. Future: switch to a real CurriculumTrack.id.
      enrollment = await prisma.learningEnrollment.create({
        data: { userId: args.userId, trackId: market },
      })
    }

    // Upsert progress row.
    const existing = await prisma.learningProgress.findFirst({
      where: { enrollmentId: enrollment.id, lessonId: lesson.id },
    })

    const now = new Date()
    // Spaced-repetition: 7 days the first time, doubling each subsequent review.
    const prevDays = existing?.nextDueAt
      ? Math.max(
          7,
          Math.round(
            (existing.nextDueAt.getTime() - (existing.lastReviewedAt?.getTime() ?? now.getTime())) /
              (24 * 60 * 60 * 1000),
          ),
        )
      : 0
    const nextDays = prevDays === 0 ? 7 : Math.min(60, prevDays * 2)
    const nextDue = new Date(now.getTime() + nextDays * 24 * 60 * 60 * 1000)

    if (existing) {
      // Take max of old and new mastery so a quick recheck doesn't lower the
      // student's recorded score.
      const merged = Math.max(existing.mastery, mastery)
      await prisma.learningProgress.update({
        where: { id: existing.id },
        data: { mastery: merged, lastReviewedAt: now, nextDueAt: nextDue },
      })
    } else {
      await prisma.learningProgress.create({
        data: {
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
          mastery,
          lastReviewedAt: now,
          nextDueAt: nextDue,
        },
      })
    }

    // ── Phase-completion milestone ─────────────────────────────
    // After this lesson is recorded, check whether ALL lessons in the
    // same phase now have progress rows for this enrollment. If so,
    // credit 200 SA points for completing the phase. Idempotent —
    // the (userId, phase_complete:<phaseId>) UNIQUE prevents a second
    // credit if the user revisits a lesson after the phase is done.
    try {
      const phase = lesson.module.phase
      const phaseLessons = await prisma.curriculumLesson.findMany({
        where: { module: { phaseId: phase.id } },
        select: { id: true },
      })
      if (phaseLessons.length > 0) {
        const completedInPhase = await prisma.learningProgress.count({
          where: {
            enrollmentId: enrollment.id,
            lessonId: { in: phaseLessons.map((l) => l.id) },
          },
        })
        if (completedInPhase >= phaseLessons.length) {
          await this.loyalty.creditMilestone({
            userId: args.userId,
            milestoneType: 'phase_complete',
            context: { phaseId: phase.id, phaseName: phase.titleEn },
          })
        }
      }
    } catch (err) {
      console.error('[mark-complete] phase milestone credit failed', {
        userId: args.userId,
        lessonSlug: args.lessonSlug,
        err,
      })
    }

    return {
      ok: true,
      lessonId: lesson.id,
      mastery: existing ? Math.max(existing.mastery, mastery) : mastery,
      reviewedAt: now.toISOString(),
      nextDueAt: nextDue.toISOString(),
      isFirstCompletion: !existing,
    }
  }
}
