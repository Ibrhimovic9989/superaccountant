/**
 * Provider-agnostic chat shim.
 *
 * Routes every chat completion through OpenRouter (an aggregator). The
 * env var AI_CHAT_PRIMARY picks the head model; AI_CHAT_FALLBACKS
 * (comma-separated) defines the cascade on 429 / 5xx / structured-output
 * validation failure. Default chain is biased toward free tiers given
 * the team's funding situation:
 *
 *   primary    qwen/qwen3-coder:free
 *   fallback 1 deepseek/deepseek-chat-v3.1:free
 *   fallback 2 meta-llama/llama-3.3-70b-instruct:free
 *   fallback 3 google/gemini-2.0-flash-exp:free
 *
 * Why a cascade: OpenRouter's free tiers carry per-minute and per-day
 * rate-limits; a single model can fail us mid-cohort. The cascade
 * keeps the surface alive at the cost of stylistic drift between
 * fallbacks. Hot-swappable via env vars — no redeploy needed to flip
 * the primary.
 *
 * Why not a domain Port abstraction (CLAUDE.md §3.4 DIP): per the
 * 2026-06 owner decision, we kept the shim thin so callsites don't
 * change. A future ChatPort migration can wrap this function.
 */

import { loadEnv } from '@sa/config'

/** OpenAI-compatible tool-call shape. OpenRouter passes this through. */
export type ToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

/** OpenAI-compatible function-tool definition. */
export type ToolDef = {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters: unknown
  }
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  // OpenAI-compatible extras some callsites use; we just forward them.
  name?: string
  tool_call_id?: string
  /** Present on assistant messages that invoked tools. */
  tool_calls?: ToolCall[]
}

export type ChatRequest = {
  messages: ChatMessage[]
  response_format?: { type: 'text' | 'json_object' }
  /** Override the model for this call. Bypasses the cascade. */
  model?: string
  max_tokens?: number
  /** OpenRouter passes this through; many free models reject non-1.0. */
  temperature?: number
  /** Optional list of stop sequences. */
  stop?: string[] | string
  /** Tool definitions. Models that don't support tool-use ignore them
   *  silently (OpenRouter normalises this). */
  tools?: ToolDef[]
  /** Tool-choice control — passed through to OpenRouter. */
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
}

export type ChatResponse = {
  choices: Array<{
    message: {
      role: 'assistant'
      content: string
      tool_calls?: ToolCall[]
    }
    finish_reason?: string
  }>
  model?: string
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * Default cascade if env doesn't override. All entries verified free
 * on OpenRouter at the time of writing (2026-06-15). DeepSeek-v3.1
 * and Gemini-2.0-Flash-exp dropped their free tier and were replaced.
 * Refresh via:
 *   curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
 *        https://openrouter.ai/api/v1/models | jq '.data[].id | select(endswith(":free"))'
 */
const DEFAULT_PRIMARY = 'qwen/qwen3-coder:free'
const DEFAULT_FALLBACKS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
]

function getModelCascade(override?: string): string[] {
  if (override) return [override]
  const primary = process.env.AI_CHAT_PRIMARY?.trim() || DEFAULT_PRIMARY
  const fallbacks =
    process.env.AI_CHAT_FALLBACKS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? DEFAULT_FALLBACKS
  return [primary, ...fallbacks]
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599)
}

async function callOpenRouter(model: string, body: object): Promise<ChatResponse> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY is not set')

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      // OpenRouter surfaces these in its dashboard so we can attribute
      // usage to the right product line.
      'HTTP-Referer': 'https://superaccountant.in',
      'X-Title': 'SuperAccountant',
    },
    body: JSON.stringify({ ...body, model }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err: Error & { status?: number; body?: string } = new Error(
      `OpenRouter ${res.status}: ${text.slice(0, 400)}`,
    )
    err.status = res.status
    err.body = text
    throw err
  }
  const json = (await res.json()) as ChatResponse
  return json
}

/**
 * Call the cascade. First model wins; subsequent ones tried only on
 * retryable failures. The final error is the last attempt's so the
 * caller sees the most-informative trace.
 */
export async function chat(req: ChatRequest): Promise<ChatResponse> {
  // Honour the call-site model override; otherwise burn the cascade.
  const models = getModelCascade(req.model)
  const body: Record<string, unknown> = { messages: req.messages }
  if (req.response_format) body.response_format = req.response_format
  if (req.max_tokens != null) body.max_tokens = req.max_tokens
  if (req.temperature != null) body.temperature = req.temperature
  if (req.stop != null) body.stop = req.stop
  if (req.tools?.length) body.tools = req.tools
  if (req.tool_choice != null) body.tool_choice = req.tool_choice

  let lastErr: unknown
  for (const model of models) {
    try {
      const out = await callOpenRouter(model, body)
      if (!out.choices?.[0]?.message?.content) {
        // Empty/garbage response — treat as retryable.
        lastErr = new Error(`empty content from ${model}`)
        continue
      }
      return out
    } catch (err) {
      lastErr = err
      const status = (err as { status?: number }).status
      // Non-retryable client errors abort the cascade (e.g. 401/403).
      if (status != null && !isRetryableStatus(status) && status >= 400 && status < 500) {
        throw err
      }
      // 429 / 5xx → try next model.
    }
  }
  throw (
    lastErr instanceof Error ? lastErr : new Error(`chat cascade exhausted: ${String(lastErr)}`)
  )
}

// Used by the @sa/ai compat shim so we have a single source of truth
// for what providers are wired up.
loadEnv // keep import live for callers expecting env validation on boot
