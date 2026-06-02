/**
 * DailyAssignmentService — generates one daily assignment per student.
 *
 * Strategy (v1):
 *   - Pick 1 SPACED REPETITION item: a lesson where lastReviewedAt was at
 *     least 7 days ago and mastery < 0.9.
 *   - Pick 1 WEAK AREA item: lowest-mastery lesson that's been reviewed.
 *   - Pick 1 NEW LESSON: the next not-yet-attempted lesson in track order.
 *
 * Each item is materialised as an AssessmentAttempt row of kind 'daily', with
 * the lesson's stored assessment_blueprint flattened into the payload.
 * Idempotent: running twice on the same day for the same user is a no-op.
 */

import { Inject, Injectable, Optional } from '@nestjs/common'
import { prisma } from '@sa/db'
import {
  SEND_PROGRESS_CARD,
  type SendProgressCardEmail,
} from './send-progress-card'

export type GenerateDailyResult = {
  userId: string
  attemptId: string
  itemCount: number
  items: { kind: 'review' | 'weak' | 'new'; lessonSlug: string; lessonTitle: string }[]
  isFresh: boolean // false if today's assignment already existed
}

export type SubmitDailyResult = {
  attemptId: string
  scorePct: number
  totalQuestions: number
  correctCount: number
}

@Injectable()
export class DailyAssignmentService {
  constructor(
    @Optional()
    @Inject(SEND_PROGRESS_CARD)
    private readonly progressCard?: SendProgressCardEmail,
  ) {}

  async generateForUser(userId: string): Promise<GenerateDailyResult | null> {
    const user = await prisma.identityUser.findUnique({
      where: { id: userId },
      select: { preferredTrack: true },
    })
    if (!user?.preferredTrack) return null
    const market = user.preferredTrack

    // Idempotent: did we already make today's daily assignment?
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const existing = await prisma.assessmentAttempt.findFirst({
      where: { userId, kind: 'daily', startedAt: { gte: startOfDay } },
      orderBy: { startedAt: 'desc' },
    })
    if (existing) {
      return {
        userId,
        attemptId: existing.id,
        itemCount: ((existing.payload as { items?: unknown[] })?.items?.length ?? 0),
        items: ((existing.payload as { items?: { kind: 'review' | 'weak' | 'new'; lessonSlug: string; lessonTitle: string }[] })?.items ??
          []),
        isFresh: false,
      }
    }

    const enrollment = await prisma.learningEnrollment.findFirst({
      where: { userId, trackId: market },
    })

    // Pull progress to find weak / spaced-rep candidates.
    const progress = enrollment
      ? await prisma.learningProgress.findMany({
          where: { enrollmentId: enrollment.id },
          orderBy: { mastery: 'asc' },
        })
      : []

    const reviewedLessonIds = new Set(progress.map((p) => p.lessonId))
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // 1. Spaced repetition candidate
    const spacedRepCandidate = progress.find(
      (p) => p.lastReviewedAt && p.lastReviewedAt < sevenDaysAgo && p.mastery < 0.9,
    )

    // 2. Weak area candidate (lowest mastery, not the spaced-rep one)
    const weakCandidate = progress.find(
      (p) => p.id !== spacedRepCandidate?.id && p.mastery < 0.75,
    )

    // 3. New lesson — first lesson in the track that the user hasn't touched.
    const newLesson = await prisma.curriculumLesson.findFirst({
      where: {
        module: { phase: { track: { market } } },
        id: { notIn: Array.from(reviewedLessonIds) },
      },
      include: { module: { include: { phase: true } } },
      orderBy: [
        { module: { phase: { order: 'asc' } } },
        { module: { order: 'asc' } },
        { order: 'asc' },
      ],
    })

    const lessonIds = [
      spacedRepCandidate?.lessonId,
      weakCandidate?.lessonId,
      newLesson?.id,
    ].filter((id): id is string => !!id)

    if (lessonIds.length === 0) return null

    const lessons = await prisma.curriculumLesson.findMany({
      where: { id: { in: lessonIds } },
      select: { id: true, slug: true, titleEn: true, titleAr: true, assessmentBlueprint: true },
    })

    const items: GenerateDailyResult['items'] = []
    const payloadItems: Array<{
      kind: 'review' | 'weak' | 'new'
      lessonSlug: string
      lessonTitle: string
      questions: unknown
    }> = []

    function pushLesson(kind: 'review' | 'weak' | 'new', lessonId: string | undefined) {
      if (!lessonId) return
      const lesson = lessons.find((l) => l.id === lessonId)
      if (!lesson) return
      items.push({ kind, lessonSlug: lesson.slug, lessonTitle: lesson.titleEn })
      // Pick first 2 questions from the lesson's assessment for the daily.
      const all = (lesson.assessmentBlueprint as unknown as Array<unknown>) ?? []
      payloadItems.push({
        kind,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.titleEn,
        questions: all.slice(0, 2),
      })
    }
    pushLesson('review', spacedRepCandidate?.lessonId)
    pushLesson('weak', weakCandidate?.lessonId)
    pushLesson('new', newLesson?.id)

    const attempt = await prisma.assessmentAttempt.create({
      data: {
        userId,
        kind: 'daily',
        trackId: market,
        status: 'in_progress',
        payload: { items: payloadItems } as unknown as object,
      },
    })

    return {
      userId,
      attemptId: attempt.id,
      itemCount: items.length,
      items,
      isFresh: true,
    }
  }

  async generateForAllActiveStudents(): Promise<{ generated: number }> {
    // Active = users with a preferredTrack and at least one sign-in in last 30 days
    // (we approximate by IdentityUser.updatedAt for now).
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const users = await prisma.identityUser.findMany({
      where: {
        preferredTrack: { not: null },
        updatedAt: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
      select: { id: true },
    })
    let generated = 0
    for (const u of users) {
      const result = await this.generateForUser(u.id)
      if (result?.isFresh) generated++
    }
    return { generated }
  }

  /**
   * Submit a daily assignment. Grades the attempt against the stored
   * answer key (the assessment_blueprint slice captured at generate time)
   * and fires the progress-card email post-grading.
   *
   * Answers are keyed by `${lessonSlug}:${questionIndex}` so the client
   * can stay stateless. Missing keys count as wrong.
   */
  async submit(args: {
    userId: string
    attemptId: string
    answers: Record<string, string>
  }): Promise<SubmitDailyResult> {
    const attempt = await prisma.assessmentAttempt.findFirst({
      where: { id: args.attemptId, userId: args.userId, kind: 'daily' },
    })
    if (!attempt) throw new Error('attempt not found')
    if (attempt.status === 'graded') throw new Error('already graded')

    const payload = attempt.payload as unknown as {
      items: Array<{
        kind: 'review' | 'weak' | 'new'
        lessonSlug: string
        lessonTitle: string
        questions: Array<{ answer?: string; topic?: string }>
      }>
    }
    let correct = 0
    let total = 0
    const wronglyAnswered: { topic: string }[] = []
    for (const item of payload.items ?? []) {
      const qs = Array.isArray(item.questions) ? item.questions : []
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i]
        if (!q || typeof q.answer !== 'string') continue
        total++
        const key = `${item.lessonSlug}:${i}`
        const given = (args.answers[key] ?? '').trim().toLowerCase()
        if (given === q.answer.trim().toLowerCase()) {
          correct++
        } else {
          wronglyAnswered.push({ topic: q.topic ?? item.lessonTitle ?? item.lessonSlug })
        }
      }
    }
    const score = total > 0 ? correct / total : 0

    await prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'graded',
        submittedAt: new Date(),
        gradedAt: new Date(),
        score,
        rubric: {
          correctCount: correct,
          total,
        } as unknown as object,
      },
    })

    // Progress-card email — same try/catch policy as grand test.
    if (this.progressCard) {
      try {
        await this.progressCard.execute({
          userId: args.userId,
          attemptKey: { table: 'AssessmentAttempt', id: attempt.id },
          assessmentKind: 'daily-assignment',
          scorePct: score * 100,
          totalQuestions: total,
          correctCount: correct,
          wronglyAnswered,
          market: attempt.trackId as 'india' | 'ksa',
        })
      } catch (err) {
        console.error('[daily-assignment] progress-card email failed', {
          userId: args.userId,
          attemptId: attempt.id,
          err: (err as Error).message,
        })
      }
    }

    return {
      attemptId: attempt.id,
      scorePct: score * 100,
      totalQuestions: total,
      correctCount: correct,
    }
  }

  async getToday(userId: string): Promise<GenerateDailyResult | null> {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const existing = await prisma.assessmentAttempt.findFirst({
      where: { userId, kind: 'daily', startedAt: { gte: startOfDay } },
      orderBy: { startedAt: 'desc' },
    })
    if (!existing) return null
    return {
      userId,
      attemptId: existing.id,
      itemCount: ((existing.payload as { items?: unknown[] })?.items?.length ?? 0),
      items: ((existing.payload as { items?: { kind: 'review' | 'weak' | 'new'; lessonSlug: string; lessonTitle: string }[] })?.items ??
        []),
      isFresh: false,
    }
  }
}
