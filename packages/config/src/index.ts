import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Chat — OpenRouter (Qwen3-Coder primary + cascade). Required.
  OPENROUTER_API_KEY: z.string().min(1),
  // Optional overrides for the cascade. Comma-separated for fallbacks.
  AI_CHAT_PRIMARY: z.string().min(1).optional(),
  AI_CHAT_FALLBACKS: z.string().optional(),

  // Embeddings — Jina v3 (1024-d). Required.
  JINA_API_KEY: z.string().min(1),

  // Azure OpenAI — RETIRED (sponsorship credit exhausted 2026-06-05).
  // Kept as optional so existing deploy envs don't fail validation; the
  // openai SDK is gone from @sa/ai, these only survive for transition.
  AZURE_OPENAI_ENDPOINT: z.string().url().optional(),
  AZURE_OPENAI_API_KEY: z.string().min(1).optional(),
  AZURE_OPENAI_DEPLOYMENT: z.string().min(1).optional(),
  AZURE_OPENAI_API_VERSION: z.string().min(1).optional(),
  AZURE_OPENAI_EMBEDDING_DEPLOYMENT: z.string().min(1).optional(),

  // Azure Document Intelligence — kept for OCR.
  AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: z.string().url().optional(),
  AZURE_DOCUMENT_INTELLIGENCE_KEY: z.string().min(1).optional(),

  // Azure Speech (TTS) — optional. If absent, the video pipeline gracefully
  // falls back to placeholder URLs and logs a warning.
  AZURE_SPEECH_KEY: z.string().min(1).optional(),
  AZURE_SPEECH_REGION: z.string().min(1).optional(),
  AZURE_SPEECH_VOICE_EN: z.string().min(1).default('en-IN-NeerjaNeural'),
  AZURE_SPEECH_VOICE_AR: z.string().min(1).default('ar-SA-ZariyahNeural'),

  // Perplexity
  PERPLEXITY_API_KEY: z.string().min(1),

  // Supabase
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.preprocess((v) => (v === '' ? undefined : v), z.string().min(1).optional()),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess((v) => (v === '' ? undefined : v), z.string().min(1).optional()),

  // NextAuth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // Email (Resend)
  RESEND_API_KEY: z.string().min(1),
  // Accepts either a bare 'foo@example.com' or the display-name form
  // 'Foo Bar <foo@example.com>'. Resend supports both — the latter is
  // what survives spam filters with a friendly From header.
  EMAIL_FROM: z
    .string()
    .min(3)
    .refine(
      (s) => /^[^<>]+@[^<>]+\.[^<>]+$/.test(s) || /^.+\s<[^<>@]+@[^<>@]+\.[^<>@]+>$/.test(s),
      { message: 'EMAIL_FROM must be an email or "Display Name <email@domain>"' },
    ),

  // Ports
  WEB_PORT: z.coerce.number().int().positive().default(3000),
  API_PORT: z.coerce.number().int().positive().default(4000),

  // Blog insights (GA4 Data API + GSC Search Analytics). Optional —
  // if the SA key is absent the aggregator no-ops and the writer agent
  // runs without the "state of the blog" briefing (so a missing
  // credential can never crash the daily post cron).
  //
  // `preprocess((v) => v === '' ? undefined : v, …)` — Vercel emits
  // empty strings for env vars set-but-empty. Without this coercion
  // the .optional() branch never fires and the whole EnvSchema fails
  // validation, throwing "Invalid environment" everywhere loadEnv is
  // called. Mirrors the SUPABASE_ANON_KEY pattern above.
  GOOGLE_SERVICE_ACCOUNT_KEY: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().min(50).optional(),
  ),
  GA4_PROPERTY_ID: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().regex(/^\d+$/).optional(),
  ),
  GSC_SITE_URL: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().min(3).optional(),
  ),
})

export type Env = z.infer<typeof EnvSchema>

let cached: Env | null = null

/**
 * Validates and returns env vars. App refuses to start with missing/invalid env.
 * Per CLAUDE.md §9.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached
  const parsed = EnvSchema.safeParse(source)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    console.error('[@sa/config] Invalid environment:', fieldErrors)
    // Include the offending field names in the thrown message so ops
    // logs (and error responses that surface the message) can pinpoint
    // the misconfig without needing to open runtime logs.
    const fields = Object.keys(fieldErrors).join(', ') || '(unknown)'
    throw new Error(`Invalid environment: ${fields}`)
  }
  cached = parsed.data
  return cached
}
