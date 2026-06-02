/**
 * SendProgressCardEmail — fire-and-forget hook called by all three
 * assessment services (entry, daily, grand) right after grading.
 *
 * Idempotency: the caller passes an `attemptKey` that maps to a row
 * (AssessmentAttempt or EntryTestSession) with a `progressEmailSentAt`
 * column. We CAS the column to NOW via raw SQL — only the winning
 * transaction sends. If Resend fails after the CAS, we accept the rare
 * miss in exchange for at-most-once delivery (per the mission brief).
 *
 * The send is wrapped in try/catch by callers — never throws past the
 * boundary, never blocks the assessment response.
 */

import { Inject, Injectable } from '@nestjs/common'
import { loadEnv } from '@sa/config'
import { prisma } from '@sa/db'
import { buildProgressCardEmail } from '@sa/email'
import type { ProgressAssessmentKind, ProgressRedoLink } from '@sa/email'
import { EMAIL_PORT, type EmailPort } from './email-port'
import {
  pickRedoLessons,
  topWeakTopics,
  type LessonForRedo,
  type WronglyAnswered,
} from '../domain/progress-card'

export type AttemptKey =
  | { table: 'AssessmentAttempt'; id: string }
  | { table: 'EntryTestSession'; id: string }

export type SendProgressCardInput = {
  userId: string
  attemptKey: AttemptKey
  assessmentKind: ProgressAssessmentKind
  scorePct: number
  totalQuestions: number
  correctCount: number
  passed?: boolean
  /** Topic of each wrongly-answered question. Order = ask order. */
  wronglyAnswered: WronglyAnswered[]
  /** Optional market for narrowing redo lesson lookup. */
  market?: 'india' | 'ksa'
}

@Injectable()
export class SendProgressCardEmail {
  constructor(@Inject(EMAIL_PORT) private readonly emailPort: EmailPort) {}

  async execute(input: SendProgressCardInput): Promise<{ sent: boolean; reason?: string }> {
    // 1. CAS the idempotency latch.
    const claimed = await claimAttempt(input.attemptKey)
    if (!claimed) return { sent: false, reason: 'already-sent' }

    // 2. Look up recipient.
    const user = await prisma.identityUser.findUnique({
      where: { id: input.userId },
      select: { email: true, name: true, locale: true, preferredTrack: true },
    })
    if (!user?.email) {
      console.warn('[progress-card] user without email, skip', { userId: input.userId })
      return { sent: false, reason: 'no-email' }
    }

    // 3. Build weak topics + redo links.
    const weakTopics = topWeakTopics(input.wronglyAnswered, 5)
    const market = input.market ?? user.preferredTrack ?? undefined
    const redoLinks = await resolveRedoLinks({
      weakTopics,
      market: market ?? null,
      locale: user.locale,
    })

    // 4. Render and send. Catch + log — never throw past the boundary.
    try {
      const env = loadEnv()
      const dashboardUrl = `${env.NEXTAUTH_URL.replace(/\/+$/, '')}/${user.locale}/learn`
      const { subject, html, text } = buildProgressCardEmail({
        recipientName: user.name ?? user.email,
        recipientEmail: user.email,
        assessmentKind: input.assessmentKind,
        scorePct: input.scorePct,
        passed: input.passed,
        totalQuestions: input.totalQuestions,
        correctCount: input.correctCount,
        weakTopics,
        redoLinks,
        dashboardUrl,
        locale: user.locale,
      })
      await this.emailPort.send({ to: user.email, subject, html, text })
      return { sent: true }
    } catch (err) {
      console.error('[progress-card] send failed', {
        userId: input.userId,
        attemptKey: input.attemptKey,
        err: (err as Error).message,
      })
      return { sent: false, reason: 'send-error' }
    }
  }
}

/**
 * Compare-and-set the progressEmailSentAt column. Returns true iff this
 * call won the race (column was NULL, now set to NOW). Subsequent
 * callers see false → skip the send.
 *
 * Raw SQL because Prisma can't express WHERE column IS NULL as the
 * sole idempotency guard without an explicit transaction.
 */
async function claimAttempt(key: AttemptKey): Promise<boolean> {
  const table = key.table === 'AssessmentAttempt' ? 'AssessmentAttempt' : 'EntryTestSession'
  const sql = `UPDATE "${table}"
               SET "progressEmailSentAt" = now()
               WHERE "id" = $1 AND "progressEmailSentAt" IS NULL`
  const updated = await prisma.$executeRawUnsafe(sql, key.id)
  return updated > 0
}

async function resolveRedoLinks(args: {
  weakTopics: string[]
  market: 'india' | 'ksa' | null
  locale: 'en' | 'ar'
}): Promise<ProgressRedoLink[]> {
  if (args.weakTopics.length === 0) return []
  // Pull a generous pool of lessons (track-bounded when we know it).
  // We grade matches in-memory rather than fanning out per-topic queries.
  const lessons = await prisma.curriculumLesson.findMany({
    where: args.market
      ? { module: { phase: { track: { market: args.market } } } }
      : undefined,
    select: {
      slug: true,
      titleEn: true,
      titleAr: true,
      module: { select: { titleEn: true, titleAr: true } },
    },
    take: 300,
  })
  const env = loadEnv()
  const flat: LessonForRedo[] = lessons.map((l) => ({
    slug: l.slug,
    titleEn: l.titleEn,
    titleAr: l.titleAr,
    moduleTitleEn: l.module?.titleEn,
    moduleTitleAr: l.module?.titleAr,
  }))
  return pickRedoLessons({
    weakTopics: args.weakTopics,
    lessons: flat,
    baseUrl: `${env.NEXTAUTH_URL.replace(/\/+$/, '')}/${args.locale}`,
    locale: args.locale,
  })
}

export const SEND_PROGRESS_CARD = Symbol('SEND_PROGRESS_CARD')
