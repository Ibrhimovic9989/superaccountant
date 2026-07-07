/**
 * Insights cron controller — nightly refresh of the GA4 + GSC rollup.
 *
 *   POST /blog/insights/refresh
 *
 * Same bearer-token pattern as blog-cron.controller.ts so the Supabase
 * cron helper can auth the same way. Response is small JSON so a log
 * scraper can pick up totals + counts without a body dump.
 */

import { Controller, Headers, Inject, Post, UnauthorizedException } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { timingSafeEqual } from 'node:crypto'
import { RefreshInsightsService } from '../application/refresh-insights.service'

@Controller('blog/insights')
export class InsightsCronController {
  constructor(
    @Inject(RefreshInsightsService)
    private readonly service: RefreshInsightsService,
  ) {}

  @SkipThrottle()
  @Post('refresh')
  async refresh(@Headers('authorization') auth: string | undefined) {
    if (!verifyBearer(auth)) {
      throw new UnauthorizedException('invalid bearer token')
    }
    try {
      const result = await this.service.execute()
      return { ok: true, ...result }
    } catch (err) {
      const reason = (err as Error).message
      console.error('[insights-cron] refresh failed', { err: reason })
      return { ok: false, error: reason }
    }
  }
}

// Same shape as blog-cron.controller.ts. Duplicated deliberately —
// duplicating 15 lines beats reaching across contexts to share a
// helper (CLAUDE.md §3.5 "no shared utils folders").
function verifyBearer(headerValue: string | undefined): boolean {
  if (!headerValue) return false
  const m = /^Bearer\s+(.+)$/i.exec(headerValue.trim())
  if (!m?.[1]) return false
  const provided = m[1].trim()
  const expected =
    process.env.BLOG_CRON_TOKEN ?? process.env.CRON_SECRET ?? process.env.NEXTAUTH_SECRET
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
