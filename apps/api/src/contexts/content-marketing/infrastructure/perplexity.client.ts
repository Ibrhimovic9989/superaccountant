/**
 * Thin Perplexity client used by the SEO research step. Separate from
 * `@sa/ai`'s generic `perplexity.ask()` because we need:
 *
 *   1. A specific model (`sonar` — fast + cheap, web access).
 *   2. A system+user message split so the response_format hint sticks.
 *   3. JSON-mode parsing with graceful recovery when the model wraps
 *      its output in ```json fences or surrounding prose. The /chat
 *      endpoint is OpenAI-compatible but the `sonar` model occasionally
 *      ignores `response_format: json_object`, so we always parse
 *      defensively.
 *
 * Behaviour on the unhappy path:
 *   - HTTP error → throw with status + body (orchestrator catches and
 *     falls through to the [] return path).
 *   - Empty content / unparseable JSON → return [] (logged at WARN).
 *   - Zod-invalid items inside a valid array → filtered out, the rest
 *     pass through. This is deliberate — Perplexity sometimes returns 4
 *     good items and one garbled one; throwing the whole batch away
 *     would be wasteful.
 */

import { loadEnv } from '@sa/config'
import { z } from 'zod'
import type {
  AudienceSegmentKey,
  Market,
  ResearchedTopic,
  UrgencySignal,
} from '../domain/types'
import { AUDIENCE_SEGMENTS, fillTopicSeed } from '../domain/audience'

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions'
const MODEL = 'sonar'

/** Cap fed into the system prompt + the orchestrator. */
export const DEFAULT_CANDIDATE_COUNT = 5

/** Per-call timeout — Sonar is fast (typically <8s) but the network round-trip can spike. */
const REQUEST_TIMEOUT_MS = 30_000

/** Strict shape we ask Perplexity to return for each item. */
const ResearchedTopicSchema = z.object({
  topic: z.string().min(4),
  summary: z.string().min(8),
  keywords: z.array(z.string().min(1)).min(1).max(15),
  competitorCoverageGap: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high']),
})

/** Top-level wrapper — accept either `{topics:[...]}` or a bare array. */
const ResponseShape = z.union([
  z.object({ topics: z.array(z.unknown()) }),
  z.array(z.unknown()),
])

export type ResearchTopicsArgs = {
  audience: AudienceSegmentKey
  market: Market
  count?: number
  /** Used as the {this_week} substitution in seed prompts. */
  weekLabel: string
}

/**
 * Calls Perplexity Sonar and returns parsed, validated topic candidates.
 * Returns `[]` on a recoverable failure so the orchestrator can route
 * to its fallback path instead of crashing the cron run.
 */
export async function researchTopics(args: ResearchTopicsArgs): Promise<ResearchedTopic[]> {
  const count = args.count ?? DEFAULT_CANDIDATE_COUNT
  const segment = AUDIENCE_SEGMENTS[args.audience]
  if (!segment) {
    console.warn('[perplexity] unknown audience, returning empty', { audience: args.audience })
    return []
  }
  const seedsSample = segment.topicSeeds
    .slice(0, 6) // keep the prompt compact — six seeds is plenty of variety
    .map((s) => `- ${fillTopicSeed(s, args.market, args.weekLabel)}`)
    .join('\n')

  const systemPrompt = buildSystemPrompt({ audience: args.audience, market: args.market, count })
  const userPrompt = [
    `Audience: ${segment.displayName}`,
    `Market: ${args.market.toUpperCase()}`,
    `Week: ${args.weekLabel}`,
    '',
    'Seed prompts to consider (use as inspiration — do not parrot verbatim):',
    seedsSample,
    '',
    `Return STRICT JSON: { "topics": [ ... ] } with exactly up to ${count} items.`,
  ].join('\n')

  const env = loadEnv()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let raw: string
  try {
    const res = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        // Perplexity's response_format API differs from OpenAI's: it
        // accepts only `text`, `json_schema`, or `regex` — never the
        // OpenAI legacy `json_object`. Rather than tie ourselves to a
        // verbose JSON Schema for a fast-moving prompt, we omit the
        // field; the system prompt already asks for STRICT JSON and the
        // defensive parser handles fenced/prose-wrapped output.
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[perplexity] HTTP error', {
        status: res.status,
        body: body.slice(0, 500),
      })
      return []
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    raw = data.choices?.[0]?.message?.content ?? ''
  } catch (err) {
    console.error('[perplexity] fetch failed', { err: (err as Error).message })
    return []
  } finally {
    clearTimeout(timer)
  }

  return parseResearchResponse(raw)
}

/**
 * Exported so the unit test can exercise the JSON-recovery path
 * without mocking fetch.
 */
export function parseResearchResponse(raw: string): ResearchedTopic[] {
  if (!raw || raw.trim().length === 0) return []
  const candidate = extractFirstJsonBlock(raw)
  let parsed: unknown
  try {
    parsed = JSON.parse(candidate)
  } catch {
    console.warn('[perplexity] JSON.parse failed', { sample: candidate.slice(0, 200) })
    return []
  }

  const shaped = ResponseShape.safeParse(parsed)
  if (!shaped.success) {
    console.warn('[perplexity] top-level shape invalid', {
      issues: shaped.error.flatten().formErrors.slice(0, 3),
    })
    return []
  }
  const items = Array.isArray(shaped.data) ? shaped.data : shaped.data.topics

  const result: ResearchedTopic[] = []
  for (const item of items) {
    const checked = ResearchedTopicSchema.safeParse(item)
    if (!checked.success) continue
    result.push(normaliseTopic(checked.data))
  }
  return result
}

/**
 * Extract the first ```json fenced block if present; otherwise return
 * the input. Handles the common Perplexity quirk of wrapping JSON in
 * a prose intro like "Here's the data:\n```json\n{...}\n```".
 */
function extractFirstJsonBlock(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  if (fenced?.[1]) return fenced[1].trim()
  // Sometimes the model just emits `{...}` or `[...]` directly.
  const trimmed = text.trim()
  return trimmed
}

function normaliseTopic(t: {
  topic: string
  summary: string
  keywords: string[]
  competitorCoverageGap?: string
  urgency: UrgencySignal
}): ResearchedTopic {
  const base: ResearchedTopic = {
    topic: t.topic.trim(),
    summary: t.summary.trim(),
    keywords: t.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean),
    urgency: t.urgency,
  }
  if (t.competitorCoverageGap) base.competitorCoverageGap = t.competitorCoverageGap.trim()
  return base
}

function buildSystemPrompt(args: {
  audience: AudienceSegmentKey
  market: Market
  count: number
}): string {
  return [
    'You are an SEO + GEO (generative engine optimisation) research assistant for SuperAccountant,',
    'an agentic LMS for accountants in India and KSA.',
    '',
    `Identify up to ${args.count} accounting topics that the ${args.audience} audience in ${args.market.toUpperCase()} is searching for THIS WEEK.`,
    'Prioritise:',
    '  1. Recency — what is trending now, not what was trending a year ago.',
    '  2. Long-tail keyword potential — specific queries with low competition.',
    '  3. Reader intent — questions a real human would type into Google or ChatGPT.',
    '',
    'Return STRICT JSON in the shape:',
    '{ "topics": [ { "topic", "summary", "keywords":[...], "competitorCoverageGap"?, "urgency":"low|medium|high" }, ... ] }',
    '',
    '- "topic" is a clear blog-post title-cased phrase (max ~80 chars).',
    '- "summary" is one sentence explaining what makes this trending right now.',
    '- "keywords" is 3-8 long-tail SEO keywords readers actually search for.',
    '- "competitorCoverageGap" (optional) names a gap in existing top-ranking articles.',
    '- "urgency" reflects how fast we should publish: regulatory deadlines → "high", evergreen → "low".',
    '',
    'Do NOT invent statistics. Do NOT cite case law you cannot verify. Stay within the audience and market.',
  ].join('\n')
}
