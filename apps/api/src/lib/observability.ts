/**
 * API observability — same shape as the web + marketing modules.
 * Currently logs structured records via pino-style console output. Wire to
 * @sentry/node by replacing the bodies of `captureException` and
 * `captureMessage` once a DSN is in env.SENTRY_DSN.
 */

import { Logger } from '@nestjs/common'

const logger = new Logger('observability')
const SENTRY_DSN = process.env.SENTRY_DSN ?? ''

export const observabilityEnabled = SENTRY_DSN.length > 0

export type ErrorContext = {
  scope?: string
  userId?: string
  tags?: Record<string, string | number | boolean>
  extra?: Record<string, unknown>
}

export function captureException(error: unknown, ctx: ErrorContext = {}): string {
  const id = randomId()
  const err = normalize(error)
  logger.error(
    {
      id,
      scope: ctx.scope ?? 'unknown',
      userId: ctx.userId,
      tags: ctx.tags,
      extra: ctx.extra,
      err: { name: err.name, message: err.message, stack: err.stack },
    },
    err.message,
  )
  return id
}

export function captureMessage(
  message: string,
  ctx: ErrorContext & { level?: 'info' | 'warn' | 'error' } = {},
): void {
  const lvl = ctx.level ?? 'info'
  const fn = lvl === 'error' ? logger.error : lvl === 'warn' ? logger.warn : logger.log
  fn.call(logger, { scope: ctx.scope, tags: ctx.tags, extra: ctx.extra }, message)
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
