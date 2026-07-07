/**
 * WritePostService — turns a researched topic into a publish-ready
 * BlogPostDraft via Azure OpenAI (gpt-5.2-chat).
 *
 * Output validation: the writer is asked to return strict JSON. We
 * Zod-validate it. On a first-pass failure we retry ONCE with a
 * pointed "your previous output didn't pass validation, fix these
 * issues" message — beyond that we throw and let the orchestrator
 * decide whether to swallow + log or surface as a cron failure.
 *
 * Cost discipline: each post = 1 Azure call (or 2 on a retry).
 * Token cap is implicit via the prompt (1200–2000 words) — we don't
 * pass `max_tokens` because the JSON output can vary in size.
 *
 * Per CLAUDE.md §4.3 — only the agent talks to Azure OpenAI; the
 * controller never does.
 */

import { Inject, Injectable } from '@nestjs/common'
import { azureOpenAI } from '@sa/ai'
import { z } from 'zod'
import { AUDIENCE_SEGMENTS } from '../domain/audience'
import type {
  AudienceSegmentKey,
  BlogPostDraft,
  Market,
  ResearchedTopic,
} from '../domain/types'
import { GetInsightsBriefingService } from './get-insights-briefing.service'

/** Minimum body length we'll accept — guards against the model producing a stub. */
const MIN_CONTENT_LEN = 2_000 // ~400 words of MDX, far short of the 1200-word target
const MAX_META_DESC_LEN = 160
const MAX_KEYWORDS = 10
const MIN_KEYWORDS = 3

const DraftSchema = z.object({
  title: z.string().min(8).max(200),
  slug: z
    .string()
    .min(8)
    .max(120)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'slug must be kebab-case alphanumerics'),
  subtitle: z.string().min(8).max(280),
  metaDescription: z.string().min(40).max(MAX_META_DESC_LEN),
  contentMdx: z.string().min(MIN_CONTENT_LEN),
  targetKeywords: z.array(z.string().min(2)).min(MIN_KEYWORDS).max(MAX_KEYWORDS),
  market: z.enum(['india', 'ksa']),
})

export type WritePostArgs = {
  topic: ResearchedTopic
  audience: AudienceSegmentKey
  market: Market
}

@Injectable()
export class WritePostService {
  constructor(
    @Inject(GetInsightsBriefingService)
    private readonly briefing: GetInsightsBriefingService,
  ) {}

  async execute(args: WritePostArgs): Promise<BlogPostDraft> {
    const insightsBriefing = await this.briefing.execute()
    const system = buildSystemPrompt(args)
    const userFirst = buildUserPrompt(args, insightsBriefing)

    // First attempt.
    const first = await this.callModel([
      { role: 'system', content: system },
      { role: 'user', content: userFirst },
    ])
    const tryFirst = tryParse(first)
    if (tryFirst.ok) return enforceMarket(tryFirst.value, args.market)

    // Retry once with a remediation message. We feed the model BOTH
    // its previous output and the validator's complaint, so it can
    // patch — not regenerate from scratch.
    console.warn('[write-post] first attempt failed schema, retrying', {
      issues: tryFirst.issues,
    })
    const retry = await this.callModel([
      { role: 'system', content: system },
      { role: 'user', content: userFirst },
      { role: 'assistant', content: first },
      {
        role: 'user',
        content: buildRemediationPrompt(tryFirst.issues),
      },
    ])
    const tryRetry = tryParse(retry)
    if (tryRetry.ok) return enforceMarket(tryRetry.value, args.market)

    throw new Error(
      `[write-post] schema invalid after retry: ${tryRetry.issues.join('; ')}`,
    )
  }

  private async callModel(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  ): Promise<string> {
    const res = await azureOpenAI().chat.completions.create({
      // Model is picked by the OpenRouter cascade in @sa/ai/chat.ts.
      model: 'placeholder',
      messages,
      // No response_format — we use the sentinel envelope, not JSON.
    })
    return res.choices[0]?.message.content ?? ''
  }
}

// ── prompt builders ──────────────────────────────────────────

function buildSystemPrompt(args: WritePostArgs): string {
  const seg = AUDIENCE_SEGMENTS[args.audience]
  const marketContext =
    args.market === 'india'
      ? 'India context: GST (CGST/SGST/IGST), TDS/TCS, Tally Prime, Zoho Books, Ind AS, Companies Act 2013, Income Tax Act 1961, CBIC notifications.'
      : 'KSA context: ZATCA e-invoicing (Fatoorah Phase 2), VAT (15%), Zakat, IFRS as endorsed by SOCPA, Mu\'tamad ERPs, Saudi labour law where relevant.'

  const indianismHint =
    args.market === 'india'
      ? 'Use Indian-English conventions where natural ("preparation" not "prep", "marked sheet" not "transcript", lakh/crore as appropriate). Currency: ₹.'
      : 'Use Saudi/Gulf-English conventions where natural. Currency: SAR / ﷼. Where dates matter, give both Gregorian and Hijri.'

  return [
    'You are SuperAccountant\'s SEO/GEO blog writer agent. You produce publish-ready blog posts',
    'optimised for both Google Search and generative-engine retrieval (Perplexity, ChatGPT, Gemini, Claude).',
    '',
    `AUDIENCE: ${seg.displayName}. ${seg.description}`,
    `MARKET: ${args.market.toUpperCase()}.`,
    '',
    marketContext,
    indianismHint,
    '',
    'TONE GUIDE:',
    seg.tonePrompt,
    '',
    'STRUCTURE REQUIREMENTS:',
    '  - 1200–2000 words total',
    '  - Open with a 2–3 sentence hook that names the reader\'s problem',
    '  - 4–7 H2 sections (use `## ` MDX syntax)',
    '  - Concrete examples with real numbers wherever a concept is introduced',
    '  - One MDX-friendly summary table OR bullet checklist somewhere in the middle',
    '  - Internal-linking: include 1–2 contextual links among these (pick the one that fits the angle):',
    '      https://app.superaccountant.in/en/quiz',
    '      https://app.superaccountant.in/en/cohort',
    '      https://app.superaccountant.in/en/jobs',
    '  - Close with this exact CTA paragraph (verbatim):',
    `      ${seg.ctaTemplate}`,
    '',
    'SEO REQUIREMENTS:',
    '  - Title: ≤ 70 chars, includes the primary keyword naturally',
    '  - Slug: kebab-case, ≤ 60 chars, derived from the title',
    `  - Meta description: 120–${MAX_META_DESC_LEN} chars, includes primary keyword, ends with the value prop`,
    `  - targetKeywords: ${MIN_KEYWORDS}–${MAX_KEYWORDS} long-tail keywords actually used in the body`,
    '',
    'ANTI-HALLUCINATION RULES:',
    '  - Where you cite a regulation, name the section / notification number (e.g. "Sec 16(2)(c) CGST Act").',
    '  - Where the official portal would be the canonical source, link to it inside the body',
    '    (cbic-gst.gov.in for India GST, incometax.gov.in for direct tax, zatca.gov.sa for KSA VAT/e-invoicing).',
    '  - Do NOT invent case-law citations, specific judge names, or recent court rulings.',
    '  - Do NOT invent statistics or surveys you can\'t source.',
    '  - When in doubt, use words like "according to the official portal" rather than fabricated specifics.',
    '',
    // We deliberately avoid asking for the whole post as a JSON
    // string — free OpenRouter models routinely emit unescaped quotes
    // inside long markdown bodies and that breaks JSON.parse. A
    // sentinel-delimited plain-text format is robust to any quoting
    // the model wants to do.
    'OUTPUT FORMAT — SENTINEL HEADERS THEN ===CONTENT=== BODY:',
    'Emit exactly these lines, in order, then a single ===CONTENT=== line',
    'followed by the full MDX body. No JSON, no markdown fences around the',
    'envelope, no commentary. Field values are everything after the colon',
    'until end-of-line (no quoting needed).',
    '',
    'TITLE: <≤ 70 chars>',
    'SLUG: <kebab-case, ≤ 60 chars>',
    'SUBTITLE: <≤ 280 chars>',
    `META: <120–${MAX_META_DESC_LEN} chars>`,
    `KEYWORDS: <${MIN_KEYWORDS}–${MAX_KEYWORDS} comma-separated long-tail phrases>`,
    `MARKET: ${args.market}`,
    '===CONTENT===',
    '<full post body in MDX, ≥ 1200 words, includes the closing CTA verbatim>',
  ].join('\n')
}

function buildUserPrompt(args: WritePostArgs, insightsBriefing = ''): string {
  const lines = [
    `TOPIC: ${args.topic.topic}`,
    `WHY IT MATTERS THIS WEEK: ${args.topic.summary}`,
    `SOURCE KEYWORDS: ${args.topic.keywords.join(', ')}`,
    `URGENCY: ${args.topic.urgency}`,
  ]
  if (args.topic.competitorCoverageGap) {
    lines.push(`COMPETITOR GAP TO EXPLOIT: ${args.topic.competitorCoverageGap}`)
  }
  if (insightsBriefing.trim().length > 0) {
    lines.push('')
    lines.push(insightsBriefing.trim())
    lines.push('')
    lines.push(
      'Lean the copy toward the queries already ranking on page 2 (breakout candidates) —',
      'work those exact phrasings into H2 headings and the meta description where they fit',
      'naturally. Do NOT stuff. Do NOT reference the analytics briefing in the post itself.',
    )
  }
  lines.push(
    '',
    'Write the post now. Output the sentinel headers (TITLE/SLUG/SUBTITLE/META/KEYWORDS/MARKET)',
    'followed by ===CONTENT=== and the MDX body. No JSON. No commentary.',
  )
  return lines.join('\n')
}

function buildRemediationPrompt(issues: string[]): string {
  return [
    'Your previous output did not pass validation. Issues:',
    ...issues.map((i) => `  - ${i}`),
    '',
    'Return the SAME post, fixed. Use the sentinel-headers + ===CONTENT=== format —',
    'no JSON, no commentary, no markdown fences around the envelope.',
  ].join('\n')
}

// ── parse helpers ─────────────────────────────────────────────

type ParseResult =
  | { ok: true; value: z.infer<typeof DraftSchema> }
  | { ok: false; issues: string[] }

/** Exported for the unit test. Pure given the input string. */
export function tryParse(raw: string): ParseResult {
  if (!raw || raw.trim().length === 0) {
    return { ok: false, issues: ['empty response from model'] }
  }
  // The model sometimes wraps the envelope in a markdown fence even
  // though we asked it not to — strip a leading fence if present.
  const candidate = stripOuterFence(raw).trim()

  // Two supported envelopes:
  //   1. Sentinel headers + ===CONTENT=== + body  (preferred, robust)
  //   2. Legacy strict JSON                       (still accepted for back-compat)
  const sentinel = tryParseSentinel(candidate)
  if (sentinel.ok) return sentinel

  // Fall back to the legacy JSON path — useful if a paid model is
  // wired in later that handles strict JSON cleanly.
  const json = tryParseJson(candidate)
  if (json.ok) return json

  return {
    ok: false,
    issues: [
      ...sentinel.issues.map((s) => `sentinel: ${s}`),
      ...json.issues.map((s) => `json: ${s}`),
    ],
  }
}

const SENTINEL_BOUNDARY = '===CONTENT==='

function tryParseSentinel(text: string): ParseResult {
  const idx = text.indexOf(SENTINEL_BOUNDARY)
  if (idx === -1) return { ok: false, issues: ['no ===CONTENT=== boundary'] }
  const header = text.slice(0, idx)
  const body = text.slice(idx + SENTINEL_BOUNDARY.length).trim()

  const fields: Record<string, string> = {}
  for (const line of header.split(/\r?\n/)) {
    const m = /^\s*([A-Z]+)\s*:\s*(.*)$/.exec(line)
    if (m) fields[m[1]!] = m[2]!.trim()
  }
  const get = (k: string): string => fields[k] ?? ''
  const market = get('MARKET').toLowerCase()
  const keywords = get('KEYWORDS')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const draft = {
    title: get('TITLE'),
    slug: get('SLUG'),
    subtitle: get('SUBTITLE'),
    metaDescription: get('META'),
    contentMdx: body,
    targetKeywords: keywords,
    market: market === 'ksa' ? 'ksa' : 'india',
  }
  const check = DraftSchema.safeParse(draft)
  if (!check.success) return { ok: false, issues: flattenIssues(check.error) }
  return { ok: true, value: check.data }
}

function tryParseJson(text: string): ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    try {
      parsed = JSON.parse(sanitiseControlChars(text))
    } catch (e2) {
      return { ok: false, issues: [`JSON.parse failed: ${(e2 as Error).message}`] }
    }
  }
  const check = DraftSchema.safeParse(parsed)
  if (!check.success) return { ok: false, issues: flattenIssues(check.error) }
  return { ok: true, value: check.data }
}

function stripOuterFence(text: string): string {
  const fenced = /^\s*```(?:[a-z]+)?\s*\n([\s\S]*?)\n```\s*$/i.exec(text)
  if (fenced?.[1]) return fenced[1]
  return text
}

/**
 * Walk a JSON-ish string and escape unescaped control characters that
 * occur inside string literals — the most common cause of JSON.parse
 * failures on free LLM output. We track quote state to avoid touching
 * keywords/structure outside strings.
 */
function sanitiseControlChars(input: string): string {
  let inStr = false
  let escape = false
  let out = ''
  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    if (!inStr) {
      if (c === '"') inStr = true
      out += c
      continue
    }
    if (escape) {
      out += c
      escape = false
      continue
    }
    if (c === '\\') {
      out += c
      escape = true
      continue
    }
    if (c === '"') {
      inStr = false
      out += c
      continue
    }
    if (c === '\n') out += '\\n'
    else if (c === '\r') out += '\\r'
    else if (c === '\t') out += '\\t'
    // Drop other 0x00-0x1F controls silently — they're invisible anyway.
    else if (c && c.charCodeAt(0) < 0x20) continue
    else out += c
  }
  return out
}

function flattenIssues(err: z.ZodError): string[] {
  return err.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
}

/** Defensive: the model must respect the market we asked for. If it
 *  diverged, force-overwrite. The body content is generated against the
 *  market hint in the system prompt so this is cosmetic. */
function enforceMarket(d: z.infer<typeof DraftSchema>, market: Market): BlogPostDraft {
  return { ...d, market }
}
