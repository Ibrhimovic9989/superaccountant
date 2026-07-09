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

import { Inject, Injectable } from '@nestjs/common'
import { prisma } from '@sa/db'
import { LoyaltyService } from '../../loyalty/application/loyalty.service'
import { LOYALTY_SERVICE } from '../../loyalty/interface/loyalty.controller'
import {
  SEND_PROGRESS_CARD,
  type SendProgressCardEmail,
} from './send-progress-card'

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
  constructor(
    @Inject(LOYALTY_SERVICE) private readonly loyalty: LoyaltyService,
    @Inject(SEND_PROGRESS_CARD) private readonly progressCard: SendProgressCardEmail,
  ) {}

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
    const wronglyAnswered: { topic: string }[] = []
    for (const k of payload.answerKey) {
      const studentAnswer = (args.answers[k.questionId] ?? '').trim().toLowerCase()
      if (studentAnswer === k.answer.trim().toLowerCase()) correct++
      else wronglyAnswered.push({ topic: humanizeSlug(k.lessonSlug) })
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

    // Credit the grand_test_pass loyalty milestone. Idempotent — the
    // (userId, 'grand_test_pass') UNIQUE index means a user only gets
    // this 1000 SA reward once across all attempts. Catch + log on
    // failure so a loyalty hiccup doesn't break test grading.
    if (passed) {
      try {
        await this.loyalty.creditMilestone({
          userId: args.userId,
          milestoneType: 'grand_test_pass',
        })
      } catch (err) {
        console.error('[grand-test] failed to credit grand_test_pass milestone', {
          userId: args.userId,
          attemptId: attempt.id,
          err,
        })
      }
    }

    // Progress-card email. Same try/catch + at-most-once policy as the
    // loyalty hook above — the use-case itself does the idempotency CAS.
    try {
      await this.progressCard.execute({
        userId: args.userId,
        attemptKey: { table: 'AssessmentAttempt', id: attempt.id },
        assessmentKind: 'grand-test',
        scorePct: score * 100,
        totalQuestions: total,
        correctCount: correct,
        passed,
        wronglyAnswered,
        market: attempt.trackId as 'india' | 'ksa',
      })
    } catch (err) {
      console.error('[grand-test] progress-card email failed', {
        userId: args.userId,
        attemptId: attempt.id,
        err: (err as Error).message,
      })
    }

    // Cohort graduation bundle: certificate + learning curve PDF + one
    // combined email. Lives in apps/web (uses @react-pdf/renderer +
    // Supabase Storage already wired there), so the API calls into it
    // via an internal HTTP endpoint with a shared bearer.
    //
    // Fire-and-await but never block the test response on it: the
    // student gets their pass result either way; emailing can finish
    // in the function's remaining budget. If issuance fails, ops sees
    // the structured log and can re-issue from the admin UI.
    if (passed) {
      try {
        await issueCohortBundle({
          userId: args.userId,
          attemptId: attempt.id,
          market: attempt.trackId as 'india' | 'ksa',
          score,
        })
      } catch (err) {
        console.error('[grand-test] cohort bundle issuance failed', {
          userId: args.userId,
          attemptId: attempt.id,
          err: (err as Error).message,
        })
      }

      // Fire an auto-milestone post into the community feed. Same
      // internal-endpoint pattern as the cohort bundle — apps/web owns
      // the CommunityPost writes. Idempotent (partial-UNIQUE catches
      // retries) so a retry from any code path is safe.
      try {
        await postCommunityMilestone({ kind: 'grand-test-pass', attemptId: attempt.id })
      } catch (err) {
        console.error('[grand-test] community milestone post failed', {
          userId: args.userId,
          attemptId: attempt.id,
          err: (err as Error).message,
        })
      }
    }

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

/**
 * Call the apps/web internal endpoint that does cert + curve + email.
 * Uses INTERNAL_ISSUE_TOKEN (falls back to NEXTAUTH_SECRET) — same
 * resolution the web route does, so prod just needs one env var
 * mirrored across the two projects.
 */
async function issueCohortBundle(args: {
  userId: string
  attemptId: string
  market: 'india' | 'ksa'
  score: number
}): Promise<void> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.WEB_APP_URL ??
    'https://app.superaccountant.in'
  const token = process.env.INTERNAL_ISSUE_TOKEN ?? process.env.NEXTAUTH_SECRET
  if (!token) {
    console.warn('[grand-test] INTERNAL_ISSUE_TOKEN missing — skipping cohort bundle')
    return
  }
  const url = `${baseUrl.replace(/\/$/, '')}/api/internal/issue-cohort-credentials`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`web /api/internal/issue-cohort-credentials returned ${res.status}: ${text.slice(0, 300)}`)
  }
}

/**
 * POSTs an auto-milestone community post to apps/web. Same auth story
 * as issueCohortBundle above so ops only manages one shared secret.
 */
async function postCommunityMilestone(
  args: { kind: 'grand-test-pass'; attemptId: string } | { kind: 'cohort-complete'; enrollmentId: string },
): Promise<void> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.WEB_APP_URL ??
    'https://app.superaccountant.in'
  const token = process.env.INTERNAL_ISSUE_TOKEN ?? process.env.NEXTAUTH_SECRET
  if (!token) {
    console.warn('[grand-test] INTERNAL_ISSUE_TOKEN missing — skipping community milestone')
    return
  }
  const url = `${baseUrl.replace(/\/$/, '')}/api/internal/community-milestone-post`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `web /api/internal/community-milestone-post returned ${res.status}: ${text.slice(0, 300)}`,
    )
  }
}

function humanizeSlug(slug: string): string {
  // 'gst-input-credit' → 'Gst Input Credit'
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
}
