/**
 * Blog cron controller — the only HTTP entry point for the SEO/GEO
 * blog writer agent.
 *
 *   POST /blog/auto-generate
 *
 * Authorisation: a single shared bearer token. Supabase Cron sends the
 * Authorization header; we compare it constant-time against
 * `BLOG_CRON_TOKEN`. Falling back to CRON_SECRET (and then to
 * NEXTAUTH_SECRET) lets local dev work without a fresh secret, but
 * production MUST set BLOG_CRON_TOKEN.
 *
 * Why no body? Two reasons:
 *   1. Cron has nothing useful to say — the rotation rule decides.
 *   2. Any payload field becomes attack surface. Keep it zero-input.
 *
 * Per-route throttle skipped: cron + this route share a single server
 * IP and would otherwise burn the bucket on the second daily call.
 */

import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Inject,
  Post,
  UnauthorizedException,
} from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { timingSafeEqual } from 'node:crypto'
import { AutoGenerateService } from '../application/auto-generate.service'
import { AutoGenerateBody } from './dto'

export const AUTO_GENERATE_SERVICE = Symbol('AUTO_GENERATE_SERVICE')

@Controller('blog')
export class BlogCronController {
  constructor(
    @Inject(AUTO_GENERATE_SERVICE)
    private readonly service: AutoGenerateService,
  ) {}

  @SkipThrottle()
  @Post('auto-generate')
  async autoGenerate(
    @Body() body: unknown,
    @Headers('authorization') auth: string | undefined,
  ) {
    if (!verifyBearer(auth)) {
      throw new UnauthorizedException('invalid bearer token')
    }

    // Body is optional. If present, parse it strictly so unexpected
    // fields are rejected rather than silently ignored.
    let now: Date | undefined
    try {
      const parsed = AutoGenerateBody.parse(body ?? {})
      if (parsed.now) now = new Date(parsed.now)
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }

    try {
      const execArgs: { now?: Date } = {}
      if (now) execArgs.now = now
      const result = await this.service.execute(execArgs)
      return {
        ok: true,
        blogPostId: result.blogPostId,
        slug: result.slug,
        title: result.title,
        audience: result.audience,
        market: result.market,
      }
    } catch (err) {
      // Cron expects JSON either way; throwing would emit Nest's HTML
      // error page and Supabase log scraper wouldn't see the reason.
      const reason = (err as Error).message
      console.error('[blog-cron] auto-generate failed', { err: reason })
      return { ok: false, error: reason }
    }
  }
}

// ── auth helper ──────────────────────────────────────────────

/**
 * Verify the `Authorization: Bearer …` header against the expected
 * token using a constant-time compare. Length-mismatch is checked
 * first to avoid timingSafeEqual's "must be same length" throw.
 *
 * Token resolution order:
 *   1. BLOG_CRON_TOKEN  (production — set explicitly)
 *   2. CRON_SECRET      (shared cron secret already in dev)
 *   3. NEXTAUTH_SECRET  (last-resort dev fallback)
 *
 * Returns false if none of the env vars are set — the endpoint is
 * never publicly reachable on a fresh deploy without explicit config.
 */
function verifyBearer(headerValue: string | undefined): boolean {
  if (!headerValue) return false
  const m = /^Bearer\s+(.+)$/i.exec(headerValue.trim())
  if (!m?.[1]) return false
  const provided = m[1].trim()

  const expected =
    process.env.BLOG_CRON_TOKEN ??
    process.env.CRON_SECRET ??
    process.env.NEXTAUTH_SECRET
  if (!expected) return false

  const providedBuf = Buffer.from(provided, 'utf8')
  const expectedBuf = Buffer.from(expected, 'utf8')
  if (providedBuf.length !== expectedBuf.length) return false
  try {
    return timingSafeEqual(providedBuf, expectedBuf)
  } catch {
    return false
  }
}
