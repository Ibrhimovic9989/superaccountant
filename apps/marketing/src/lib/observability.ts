/**
 * Marketing observability — same shape as the web app.
 * See apps/web/src/lib/observability.ts for the rationale.
 */

const SENTRY_DSN =
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN ?? '')
    : ''

export const observabilityEnabled = SENTRY_DSN.length > 0

export type ErrorContext = {
  scope?: string
  tags?: Record<string, string | number | boolean>
  extra?: Record<string, unknown>
}

export function captureException(error: unknown, ctx: ErrorContext = {}): string {
  const id = randomId()
  const err = normalize(error)
  // eslint-disable-next-line no-console
  console.error(`[observability:${id}]`, ctx.scope ?? 'error', err, ctx)
  return id
}

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
  return Math.random().toString(36).slice(2, 10)
}
