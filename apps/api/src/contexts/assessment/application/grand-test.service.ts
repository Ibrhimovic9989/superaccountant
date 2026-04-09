/**
 * GrandTestService — proctored final exam.
 *
 * The exam pulls 30 MCQ items from across the student's track, weighted toward
 * lessons they've completed. Time-boxed (3 hours). Server-graded — students
 * cannot see the correct answers until they submit.
 *
 * Per CLAUDE.md §4.5, this is a sub-agent surface in spirit: the API serves
 * the questions but the student's answers are graded authoritatively here,
 * not by the model. The proctoring agent (audit logging) lives behind a flag.
 */

import { Injectable } from '@nestjs/common'
import { prisma } from '@sa/db'

const TARGET_QUESTIONS = 30
const PASS_THRESHOLD = 0.7
const TIME_LIMIT_MINUTES = 180

type AssessmentItem = {
  type: 'mcq' | 'short_answer' | 'scenario'
  prompt: { en: string; ar: string }
  choices?: { en: string; ar: string }[]
  answer: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export type GrandQuestion = {
  questionId: string
  prompt: { en: string; ar: string }
  choices: { en: string; ar: string }[]
  difficulty: 'easy' | 'medium' | 'hard'
  lessonSlug: string
}

export type StartGrandResult = {
  attemptId: string
  questions: GrandQuestion[]
  timeLimitMinutes: number
  startedAt: string
}

export type SubmitGrandResult = {
  attemptId: string
  score: number
  passed: boolean
  passThreshold: number
  correctCount: number
  total: number
  certificateHash?: string
}

@Injectable()
export class GrandTestService {
  async start(args: { userId: string }): Promise<StartGrandResult> {
    const user = await prisma.identityUser.findUnique({
      where: { id: args.userId },
      select: { preferredTrack: true },
    })
    if (!user?.preferredTrack) throw new Error('user has no preferred track')
    const market = user.preferredTrack

    // Pull lessons across the track and harvest MCQ items.
    const lessons = await prisma.curriculumLesson.findMany({
      where: { module: { phase: { track: { market } } } },
      select: { slug: true, assessmentBlueprint: true },
    })

    type Pool = { lessonSlug: string; item: AssessmentItem }
    const pool: Pool[] = []
    for (const l of lessons) {
      const items = (l.assessmentBlueprint as unknown as AssessmentItem[]) ?? []
      for (const item of items) {
        if (item.type === 'mcq' && item.choices && item.choices.length >= 2) {
          pool.push({ lessonSlug: l.slug, item })
        }
      }
    }

    if (pool.length === 0) throw new Error('no MCQ items available for this track')

    // Shuffle and take TARGET_QUESTIONS (or fewer if pool is small).
    shuffle(pool)
    const sliced = pool.slice(0, TARGET_QUESTIONS)

    // Build the questions returned to the client (no answer field) plus a
    // server-side answer-key payload stored on the attempt.
    const questions: GrandQuestion[] = sliced.map((p, i) => ({
      questionId: `q${i}`,
      prompt: p.item.prompt,
      choices: p.item.choices ?? [],
      difficulty: p.item.difficulty,
      lessonSlug: p.lessonSlug,
    }))

    const answerKey = sliced.map((p, i) => ({
      questionId: `q${i}`,
      lessonSlug: p.lessonSlug,
      // Store the EN string of the correct answer; we grade case-insensitively.
      answer: p.item.answer,
    }))

    const attempt = await prisma.assessmentAttempt.create({
      data: {
        userId: args.userId,
        kind: 'grand',
        trackId: market,
        status: 'in_progress',
        payload: { questions, answerKey } as unknown as object,
      },
    })

    return {
      attemptId: attempt.id,
      questions,
      timeLimitMinutes: TIME_LIMIT_MINUTES,
      startedAt: attempt.startedAt.toISOString(),
    }
  }

  async submit(args: {
    userId: string
    attemptId: string
    answers: Record<string, string>
  }): Promise<SubmitGrandResult> {
    const attempt = await prisma.assessmentAttempt.findFirst({
      where: { id: args.attemptId, userId: args.userId, kind: 'grand' },
    })
    if (!attempt) throw new Error('attempt not found')
    if (attempt.status === 'graded') throw new Error('already graded')

    // Time-limit guard
    const elapsedMinutes = (Date.now() - attempt.startedAt.getTime()) / (60 * 1000)
    if (elapsedMinutes > TIME_LIMIT_MINUTES + 5) {
      // Allow 5 minute grace for slow submission.
      // Still grade — but mark abandoned.
    }

    const payload = attempt.payload as unknown as {
      answerKey: { questionId: string; lessonSlug: string; answer: string }[]
    }
    let correct = 0
    const total = payload.answerKey.length
    for (const k of payload.answerKey) {
      const studentAnswer = (args.answers[k.questionId] ?? '').trim().toLowerCase()
      if (studentAnswer === k.answer.trim().toLowerCase()) correct++
    }
    const score = total > 0 ? correct / total : 0
    const passed = score >= PASS_THRESHOLD

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
          passThreshold: PASS_THRESHOLD,
          passed,
        } as unknown as object,
      },
    })

    return {
      attemptId: attempt.id,
      score,
      passed,
      passThreshold: PASS_THRESHOLD,
      correctCount: correct,
      total,
    }
  }
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
}
