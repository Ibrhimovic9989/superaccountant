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
  /**
   * Optional markdown briefing derived from GA4 + GSC (see
   * insights-briefing.ts). When present, we drop it into the user
   * message so Perplexity can prefer topics that align with breakout
   * queries or refresh under-performing pages.
   */
  insightsBriefing?: string
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
  const userLines: string[] = [
    `Audience: ${segment.displayName}`,
    `Market: ${args.market.toUpperCase()}`,
    `Week: ${args.weekLabel}`,
  ]
  if (args.insightsBriefing && args.insightsBriefing.trim().length > 0) {
    userLines.push('')
    userLines.push(args.insightsBriefing.trim())
    userLines.push('')
    userLines.push(
      'Use the above analytics briefing when prioritising: prefer topic ideas that (a) target the same query intents where we already rank on page 2, (b) cluster around our best-performing pages so we can build internal-link authority, and (c) freshen topics whose pages have declined WoW. Do NOT reproduce URLs from the briefing verbatim — use the signal, generate original topics.',
    )
  }
  userLines.push('')
  userLines.push(
    'Seed prompts to consider (use as inspiration — do not parrot verbatim):',
  )
  userLines.push(seedsSample)
  userLines.push('')
  userLines.push(`Return STRICT JSON: { "topics": [ ... ] } with exactly up to ${count} items.`)
  const userPrompt = userLines.join('\n')

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
    'an agentic LMS for accountants in India and KSA. The site is BRAND NEW (DR ≈ 0, few backlinks),',
    'so head terms like "AI in accounting" or "GST filing" are unrankable — the Big 4 own those SERPs.',
    'Your job is to find topics we CAN rank for from a standing start.',
    '',
    `Identify up to ${args.count} accounting topics that the ${args.audience} audience in ${args.market.toUpperCase()} is searching for THIS WEEK.`,
    '',
    'HARD FILTERS — the topic MUST satisfy every one of these:',
    '  A. Long-tail: primary keyword is ≥ 5 words. Reject anything <5 words.',
    '     Example GOOD: "gstr-3b late fee waiver notification 14/2026 filing steps"',
    '     Example BAD:  "gst filing tips" · "audit checklist" · "how to file taxes"',
    '  B. Specificity anchor: the topic ties to at least ONE of {section number,',
    '     notification/circular number, a specific date, a named form, a named portal,',
    '     a named case citation you can verify}. If none, reject.',
    '  C. Answerable definitively in 1200–1800 words. Reject broad "guide to X" topics',
    '     that would need 5000 words to be credible.',
    '  D. Zero Big-4-parity: if kpmg.com / deloitte.com / ey.com / pwc.in already has a page',
    '     ranking on page 1 for the same phrase, reject. Look for the gap they missed.',
    '',
    'PRIORITISE within the filter:',
    '  1. Regulatory recency — new CBIC/ZATCA/SOCPA notification, budget item, deadline in',
    '     the next 90 days. These beat evergreen every time.',
    '  2. Procedural / step-by-step queries — readers with clear intent convert.',
    '  3. Near-brand queries — searches that would naturally trigger a "SuperAccountant"',
    '     mention (e.g. "accountant training portal saudi zakat").',
    '',
    'Return STRICT JSON in the shape:',
    '{ "topics": [ { "topic", "summary", "keywords":[...], "competitorCoverageGap"?, "urgency":"low|medium|high" }, ... ] }',
    '',
    '- "topic" is a clear blog-post title-cased phrase (max ~80 chars) that ITSELF contains the',
    '   ≥ 5-word primary keyword verbatim.',
    '- "summary" is one sentence naming the specificity anchor (section, notification, date, portal).',
    '- "keywords" is 3–8 long-tail SEO keywords, each ≥ 4 words. Not "gst return" — "gstr-3b late fee waiver 2026".',
    '- "competitorCoverageGap" (STRONGLY encouraged) names a gap in the top-ranking article that we can exploit.',
    '- "urgency" reflects how fast we should publish: regulatory deadline in next 30 days → "high",',
    '   deadline in 30–90 days → "medium", evergreen → "low".',
    '',
    'Do NOT invent statistics. Do NOT cite case law you cannot verify. Stay within the audience and market.',
    'If you cannot find 5 topics meeting the HARD FILTERS, return fewer — quality over quota.',
  ].join('\n')
}
