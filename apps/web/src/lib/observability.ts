/**
 * Observability — single module the rest of the app calls when something
 * goes wrong or when we want to track an interesting event.
 *
 * This is intentionally provider-agnostic: it logs to the console today and
 * is a no-op for unset providers. To wire Sentry later, install
 * `@sentry/nextjs`, set `NEXT_PUBLIC_SENTRY_DSN` in your env, and replace
 * the bodies of `captureException` and `captureMessage` with the real SDK
 * calls. Nothing else in the codebase has to change.
 *
 * Why a wrapper instead of calling Sentry directly:
 *  - We can swap providers (Sentry → Datadog → Honeybadger) without touching
 *    every error.tsx and catch block.
 *  - In dev, `console.error` is the right thing — no DSN needed.
 *  - Tests can spy on these functions without mocking the whole SDK.
 */

const SENTRY_DSN =
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN ?? '')
    : ''

/** True when a real reporter is configured. Use this to gate UI hints. */
export const observabilityEnabled = SENTRY_DSN.length > 0

export type ErrorContext = {
  /** A short string identifying the place this error happened (e.g. "lesson-shell.markComplete"). */
  scope?: string
  /** Authenticated user id, if known. Never include email or PII. */
  userId?: string
  /** Free-form key/value tags for filtering in the dashboard. */
  tags?: Record<string, string | number | boolean>
  /** Larger structured payload — request bodies, error responses, etc. */
  extra?: Record<string, unknown>
}

/**
 * Capture an exception. Call this in catch blocks and inside `error.tsx`.
 * Returns a synthetic error id you can show to the user for support.
 */
export function captureException(error: unknown, ctx: ErrorContext = {}): string {
  const id = randomId()
  const err = normalize(error)
  // eslint-disable-next-line no-console
  console.error(`[observability:${id}]`, ctx.scope ?? 'error', err, ctx)

  // ── To enable Sentry, replace the body below ──
  // import * as Sentry from '@sentry/nextjs'
  // Sentry.captureException(err, {
  //   tags: { scope: ctx.scope ?? 'unknown', ...ctx.tags },
  //   user: ctx.userId ? { id: ctx.userId } : undefined,
  //   extra: { id, ...ctx.extra },
  // })

  return id
}

/**
 * Capture a non-error event of interest. For analytics events, prefer
 * `lib/analytics.ts` which is a separate concern.
 */
export function captureMessage(
  message: string,
  ctx: ErrorContext & { level?: 'info' | 'warning' | 'error' } = {},
): void {
  const lvl = ctx.level ?? 'info'
  // eslint-disable-next-line no-console
  console[lvl === 'error' ? 'error' : lvl === 'warning' ? 'warn' : 'log'](
    `[observability]`,
    ctx.scope ?? message,
    message,
    ctx,
  )

  // ── To enable Sentry, replace the body below ──
  // import * as Sentry from '@sentry/nextjs'
  // Sentry.captureMessage(message, { level: lvl, tags: ctx.tags, user: ... })
}

function normalize(error: unknown): Error {
  if (error instanceof Error) return error
  if (typeof error === 'string') return new Error(error)
  try {
    return new Error(JSON.stringify(error))
  } catch {
    return new Error(String(error))
  }
}

function randomId(): string {
  // 8-char base36 id — enough entropy for support reference, no crypto needed.
  return Math.random().toString(36).slice(2, 10)
}
