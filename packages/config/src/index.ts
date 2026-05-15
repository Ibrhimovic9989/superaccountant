import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Azure OpenAI
  AZURE_OPENAI_ENDPOINT: z.string().url(),
  AZURE_OPENAI_API_KEY: z.string().min(1),
  AZURE_OPENAI_DEPLOYMENT: z.string().min(1),
  AZURE_OPENAI_API_VERSION: z.string().min(1),
  AZURE_OPENAI_EMBEDDING_DEPLOYMENT: z.string().min(1),

  // Azure Document Intelligence
  AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: z.string().url(),
  AZURE_DOCUMENT_INTELLIGENCE_KEY: z.string().min(1),

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
    console.error('[@sa/config] Invalid environment:')
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error('Invalid environment')
  }
  cached = parsed.data
  return cached
}
