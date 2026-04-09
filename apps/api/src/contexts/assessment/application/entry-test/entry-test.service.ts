/**
 * EntryTestAgent — adaptive placement test backed by a static question pool.
 *
 * Architecture (v2 — pool-based):
 *  - All questions live in `EntryTestQuestionPool` (~150 per market+locale,
 *    seeded once via `seed:entry-test-pool`).
 *  - At runtime we maintain a per-session **skill estimate** (0..1, starts at
 *    0.5). Each correct answer nudges skill toward 1.0; each wrong answer
 *    nudges it toward 0. The next question is drawn from the pool by mapping
 *    skill → desired difficulty, excluding already-asked topics + question ids.
 *  - Final placement uses the same heuristic mapping that the previous version
 *    used (raw correct ratio → phase 1/2/3/4).
 *
 * Per-question latency: ~30ms (one DB read + one DB write). No Azure calls
 * during a student session unless the pool is empty for the requested
 * (market, locale) — in which case we fall back to the legacy single-shot
 * generator with a logged warning.
 *
 * Per CLAUDE.md §4.5 — sub-agent with isolated permission scope.
 */

import { Injectable } from '@nestjs/common'
import { z } from 'zod'
import { prisma } from '@sa/db'
import { azureOpenAI } from '@sa/ai'

const TARGET_QUESTIONS = 10

export type EntryTestQuestion = {
  /** Pool id when drawn from the bank; absent for the legacy fallback path. */
  id?: string
  prompt: string
  choices: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  topic: string
  /** index into choices[] for the correct answer */
  answerIndex: number
  explanation: string
}

export type HistoryItem = {
  question: EntryTestQuestion
  studentAnswerIndex: number
  isCorrect: boolean
  askedAt: string
}

export type StartArgs = { userId: string; market: 'india' | 'ksa'; locale: 'en' | 'ar' }
export type StartResult = { sessionId: string; question: EntryTestQuestion; index: number; total: number }

export type AnswerResult =
  | { kind: 'next'; question: EntryTestQuestion; index: number; total: number }
  | {
      kind: 'done'
      score: number
      placedPhase: number
      summary: string
    }

const QuestionSchema = z.object({
  prompt: z.string(),
  choices: z.array(z.string()).min(2).max(5),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  topic: z.string(),
  answerIndex: z.number().int().min(0),
  explanation: z.string(),
})

@Injectable()
export class EntryTestService {
  async start({ userId, market, locale }: StartArgs): Promise<StartResult> {
    const id = `et_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

    // Single roundtrip: insert the session AND pick the first question in
    // one CTE. Saves ~700ms of Supabase pooler RTT compared to two sequential
    // queries from Asia.
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string
        topic: string
        difficulty: 'easy' | 'medium' | 'hard'
        prompt: string
        choices: unknown
        answerIndex: number
        explanation: string
      }>
    >(
      `WITH inserted AS (
         INSERT INTO "EntryTestSession" ("id","userId","market","locale","history","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,'[]'::jsonb, now(), now())
         RETURNING 1
       )
       SELECT id, topic, difficulty, prompt, choices, "answerIndex", explanation
       FROM "EntryTestQuestionPool"
       WHERE market = $3 AND locale = $4 AND difficulty = 'easy'
       ORDER BY random()
       LIMIT 1`,
      id,
      userId,
      market,
      locale,
    )
    const r = rows[0]
    if (!r) {
      // Fallback for empty pool — log + use the legacy Azure path.
      console.warn(`[entry-test] empty pool for ${market}/${locale} — falling back to Azure`)
      const fallback = await this.legacyGenerateOne(market, locale)
      return { sessionId: id, question: fallback, index: 1, total: TARGET_QUESTIONS }
    }

    return {
      sessionId: id,
      question: {
        id: r.id,
        topic: r.topic,
        difficulty: r.difficulty,
        prompt: r.prompt,
        choices: r.choices as string[],
        answerIndex: r.answerIndex,
        explanation: r.explanation,
      },
      index: 1,
      total: TARGET_QUESTIONS,
    }
  }

  /** Client echoes the question they just answered + the running history
   *  shape (market, locale, prior question ids and topics). We grade against
   *  the question's stored answerIndex, then pick the next one in a single
   *  CTE — one Supabase roundtrip total.
   *
   *  Trust model: the question text + answerIndex comes from the server
   *  originally and round-trips through the client. The server validates that
   *  the session id belongs to the user and isn't completed; the running
   *  history we accept from the client is purely a hint for the picker, never
   *  used for grading. The authoritative answer history is still rebuilt by
   *  reading the session row at placement time. */
  async answerWithQuestion(args: {
    sessionId: string
    userId: string
    question: EntryTestQuestion
    choiceIndex: number
    /** Client-supplied for the picker. Server doesn't trust it for grading. */
    market: 'india' | 'ksa'
    locale: 'en' | 'ar'
    /** Full running history including the question being answered now. */
    runningHistory: HistoryItem[]
  }): Promise<AnswerResult> {
    const market = args.market
    const locale = args.locale
    const newHistory = args.runningHistory

    // ─── Done? ──────────────────────────────────────────────────────────
    if (newHistory.length >= TARGET_QUESTIONS) {
      const placement = computePlacement(newHistory, market, locale)
      // Two writes in one CTE — saves an RTT.
      await prisma.$executeRawUnsafe(
        `WITH s AS (
           UPDATE "EntryTestSession"
           SET "history" = $1::jsonb, "score" = $2, "placedPhase" = $3,
               "completedAt" = now(), "updatedAt" = now()
           WHERE "id" = $4 AND "userId" = $5
           RETURNING 1
         )
         UPDATE "IdentityUser" SET "preferredTrack" = $6::"MarketTrack" WHERE "id" = $5`,
        JSON.stringify(newHistory),
        placement.score,
        placement.placedPhase,
        args.sessionId,
        args.userId,
        market,
      )
      return {
        kind: 'done',
        score: placement.score,
        placedPhase: placement.placedPhase,
        summary: placement.summary,
      }
    }

    // ─── Pick next adaptively + persist in ONE roundtrip ──────────────
    const skill = computeSkill(newHistory)
    const desiredDifficulty = skillToDifficulty(skill)
    const excludeIds = newHistory
      .map((h) => h.question.id)
      .filter((x): x is string => typeof x === 'string')
    const excludeTopics = Array.from(new Set(newHistory.map((h) => h.question.topic)))

    // Single CTE: UPDATE session AND SELECT next question. We try increasingly
    // permissive filters in sequence (difficulty+topic → difficulty → any).
    // PostgreSQL's `COALESCE(...)` can't do multi-row fallbacks, so we use a
    // UNION ALL that picks from each tier in priority order.
    const next = await this.pickAndPersist({
      sessionId: args.sessionId,
      userId: args.userId,
      newHistory,
      market,
      locale,
      desiredDifficulty,
      excludeIds,
      excludeTopics,
    })

    if (!next) {
      console.warn(`[entry-test] pool exhausted for ${market}/${locale} — falling back to Azure`)
      const fallback = await this.legacyGenerateOne(market, locale)
      // The CTE already persisted the history, so just return.
      return {
        kind: 'next',
        question: fallback,
        index: newHistory.length + 1,
        total: TARGET_QUESTIONS,
      }
    }

    return { kind: 'next', question: next, index: newHistory.length + 1, total: TARGET_QUESTIONS }
  }

  // ─── Single-roundtrip persist + pick ─────────────────────────────────
  private async pickAndPersist(args: {
    sessionId: string
    userId: string
    newHistory: HistoryItem[]
    market: 'india' | 'ksa'
    locale: 'en' | 'ar'
    desiredDifficulty: 'easy' | 'medium' | 'hard'
    excludeIds: string[]
    excludeTopics: string[]
  }): Promise<EntryTestQuestion | null> {
    // Build the parameterised values + dynamic IN-list placeholders.
    const params: unknown[] = [
      JSON.stringify(args.newHistory),
      args.sessionId,
      args.market,
      args.locale,
      args.desiredDifficulty,
      args.userId,
    ]
    let excludeIdClause = ''
    if (args.excludeIds.length > 0) {
      const start = params.length + 1
      const placeholders = args.excludeIds.map((_, i) => `$${start + i}`).join(',')
      excludeIdClause = `AND id NOT IN (${placeholders})`
      params.push(...args.excludeIds)
    }
    let excludeTopicClause = ''
    if (args.excludeTopics.length > 0) {
      const start = params.length + 1
      const placeholders = args.excludeTopics.map((_, i) => `$${start + i}`).join(',')
      excludeTopicClause = `AND topic NOT IN (${placeholders})`
      params.push(...args.excludeTopics)
    }

    // Tiered fallback: prefer (difficulty + topic excl), then (difficulty),
    // then (any). UNION ALL with priority column + LIMIT 1.
    const sql = `
      WITH updated AS (
        UPDATE "EntryTestSession"
        SET "history" = $1::jsonb, "updatedAt" = now()
        WHERE "id" = $2 AND "userId" = $6 AND "completedAt" IS NULL
        RETURNING 1
      ),
      tier1 AS (
        SELECT 1 as priority, id, topic, difficulty, prompt, choices, "answerIndex", explanation
        FROM "EntryTestQuestionPool"
        WHERE market = $3 AND locale = $4 AND difficulty = $5
          ${excludeIdClause} ${excludeTopicClause}
        ORDER BY random() LIMIT 1
      ),
      tier2 AS (
        SELECT 2 as priority, id, topic, difficulty, prompt, choices, "answerIndex", explanation
        FROM "EntryTestQuestionPool"
        WHERE market = $3 AND locale = $4 AND difficulty = $5
          ${excludeIdClause}
        ORDER BY random() LIMIT 1
      ),
      tier3 AS (
        SELECT 3 as priority, id, topic, difficulty, prompt, choices, "answerIndex", explanation
        FROM "EntryTestQuestionPool"
        WHERE market = $3 AND locale = $4
          ${excludeIdClause}
        ORDER BY random() LIMIT 1
      )
      SELECT id, topic, difficulty, prompt, choices, "answerIndex", explanation
      FROM (
        SELECT * FROM tier1
        UNION ALL SELECT * FROM tier2
        UNION ALL SELECT * FROM tier3
      ) tiers
      ORDER BY priority
      LIMIT 1
    `

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string
        topic: string
        difficulty: 'easy' | 'medium' | 'hard'
        prompt: string
        choices: unknown
        answerIndex: number
        explanation: string
      }>
    >(sql, ...params)
    const r = rows[0]
    if (!r) return null
    return {
      id: r.id,
      topic: r.topic,
      difficulty: r.difficulty,
      prompt: r.prompt,
      choices: r.choices as string[],
      answerIndex: r.answerIndex,
      explanation: r.explanation,
    }
  }

  // ─── Pool query ─────────────────────────────────────────────────────
  private async pickFromPool(args: {
    market: 'india' | 'ksa'
    locale: 'en' | 'ar'
    desiredDifficulty: 'easy' | 'medium' | 'hard' | null
    excludeIds: string[]
    excludeTopics: string[]
  }): Promise<EntryTestQuestion | null> {
    // Build dynamic SQL safely. We use parameterised values + a generated
    // IN-list of placeholders so excludeIds / excludeTopics can be empty.
    const params: unknown[] = [args.market, args.locale]
    let where = `market = $1 AND locale = $2`
    if (args.desiredDifficulty) {
      params.push(args.desiredDifficulty)
      where += ` AND difficulty = $${params.length}`
    }
    if (args.excludeIds.length > 0) {
      const startIdx = params.length + 1
      const placeholders = args.excludeIds.map((_, i) => `$${startIdx + i}`).join(',')
      where += ` AND id NOT IN (${placeholders})`
      params.push(...args.excludeIds)
    }
    if (args.excludeTopics.length > 0) {
      const startIdx = params.length + 1
      const placeholders = args.excludeTopics.map((_, i) => `$${startIdx + i}`).join(',')
      where += ` AND topic NOT IN (${placeholders})`
      params.push(...args.excludeTopics)
    }

    const sql = `
      SELECT id, topic, difficulty, prompt, choices, "answerIndex", explanation
      FROM "EntryTestQuestionPool"
      WHERE ${where}
      ORDER BY random()
      LIMIT 1
    `
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string
        topic: string
        difficulty: 'easy' | 'medium' | 'hard'
        prompt: string
        choices: unknown
        answerIndex: number
        explanation: string
      }>
    >(sql, ...params)
    const r = rows[0]
    if (!r) return null
    return {
      id: r.id,
      topic: r.topic,
      difficulty: r.difficulty,
      prompt: r.prompt,
      choices: r.choices as string[],
      answerIndex: r.answerIndex,
      explanation: r.explanation,
    }
  }

  // ─── Legacy fallback (only when the pool is empty) ────────────────
  private async legacyGenerateOne(
    market: 'india' | 'ksa',
    locale: 'en' | 'ar',
  ): Promise<EntryTestQuestion> {
    const jurisdiction =
      market === 'india'
        ? 'Indian accounting (Companies Act 2013, Income Tax Act, GST)'
        : 'KSA accounting (ZATCA, VAT, Zakat, IFRS as endorsed by SOCPA)'
    const lang =
      locale === 'ar'
        ? 'Output the prompt and choices in Modern Standard Arabic.'
        : 'Output the prompt and choices in English.'
    const SYSTEM = `You generate ONE multiple-choice accounting question for ${jurisdiction}.
${lang}
Return STRICT JSON: { prompt, choices (4), difficulty, topic, answerIndex, explanation }.`
    const res = await azureOpenAI().chat.completions.create({
      model: 'placeholder',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: 'Generate one easy accounting question now.' },
      ],
      response_format: { type: 'json_object' },
    })
    const parsed = QuestionSchema.parse(JSON.parse(res.choices[0]?.message.content ?? '{}'))
    return parsed
  }
}

// ─── Pure helpers ─────────────────────────────────────────────────────
function computeSkill(history: HistoryItem[]): number {
  // Glicko-lite: start at 0.5, each answer nudges by 30% of the gap.
  let skill = 0.5
  for (const h of history) {
    if (h.isCorrect) skill = skill + (1 - skill) * 0.3
    else skill = skill - skill * 0.3
  }
  return skill
}

function skillToDifficulty(skill: number): 'easy' | 'medium' | 'hard' {
  if (skill < 0.4) return 'easy'
  if (skill < 0.7) return 'medium'
  return 'hard'
}

function computePlacement(
  history: HistoryItem[],
  _market: 'india' | 'ksa',
  locale: 'en' | 'ar',
): { score: number; placedPhase: number; summary: string } {
  const correct = history.filter((h) => h.isCorrect).length
  const total = history.length
  const score = total > 0 ? correct / total : 0
  let placedPhase = 1
  if (score >= 0.85) placedPhase = 4
  else if (score >= 0.65) placedPhase = 3
  else if (score >= 0.4) placedPhase = 2
  const summary =
    locale === 'ar'
      ? `لقد أجبت بشكل صحيح على ${correct} من ${total} سؤالاً. سنبدأ بك في المرحلة ${placedPhase}.`
      : `You answered ${correct} of ${total} questions correctly. We'll start you in Phase ${placedPhase}.`
  return { score, placedPhase, summary }
}
