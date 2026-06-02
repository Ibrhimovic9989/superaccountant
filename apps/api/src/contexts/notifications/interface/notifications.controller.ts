/**
 * Notifications HTTP surface.
 *
 *   POST /notifications/dispatch-due       — cron-callable. Picks pending
 *                                            rows and dispatches them.
 *                                            Auth: X-Cron-Secret header
 *                                            matching CRON_SECRET or
 *                                            NEXTAUTH_SECRET (same
 *                                            pattern as assignments/
 *                                            generate-daily).
 *   POST /notifications/preferences/get    — current user's preferences,
 *                                            defaults filled in.
 *   POST /notifications/preferences/update — toggle one (channel,
 *                                            category) entry.
 *
 * Per-user endpoints take a userId in the body — same convention used by
 * /assignments/submit. The web app already authenticates the user
 * server-side via NextAuth and forwards a trusted userId.
 */

import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Inject,
  Post,
} from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { z } from 'zod'
import {
  DISPATCH_DUE_SERVICE,
  type DispatchDueNotifications,
} from '../application/dispatch-due.service'
import {
  PREFERENCE_REPOSITORY,
  type PreferenceRepository,
} from '../infrastructure/preferences.repository'
import { ALL_CATEGORIES, ALL_CHANNELS } from '../domain/types'

// z.enum needs a non-empty tuple; declare the literal tuples inline
// so we don't depend on `as` casts. Kept in sync with domain/types.ts
// via the ALL_CHANNELS / ALL_CATEGORIES exports used elsewhere.
const ChannelEnum = z.enum(['in_app', 'email', 'push', 'whatsapp'])
const CategoryEnum = z.enum([
  'class_reminder',
  'daily_nudge',
  'streak_at_risk',
  'weekly_progress',
  'system',
])
const FrequencyEnum = z.enum(['immediate', 'daily_digest', 'weekly'])

const GetPrefsBody = z.object({ userId: z.string().min(1) })
const UpdatePrefsBody = z.object({
  userId: z.string().min(1),
  channel: ChannelEnum,
  category: CategoryEnum,
  optedIn: z.boolean(),
  frequencyHint: FrequencyEnum.optional(),
})

@Controller('notifications')
export class NotificationsController {
  constructor(
    @Inject(DISPATCH_DUE_SERVICE) private readonly dispatcher: DispatchDueNotifications,
    @Inject(PREFERENCE_REPOSITORY) private readonly prefs: PreferenceRepository,
  ) {}

  @SkipThrottle()
  @Post('dispatch-due')
  async dispatchDue(@Headers('x-cron-secret') secret: string | undefined) {
    const expected = process.env.CRON_SECRET ?? process.env.NEXTAUTH_SECRET
    if (!expected || secret !== expected) {
      throw new ForbiddenException('invalid cron secret')
    }
    const summary = await this.dispatcher.execute()
    return summary
  }

  @Post('preferences/get')
  async getPreferences(@Body() body: unknown) {
    try {
      const { userId } = GetPrefsBody.parse(body)
      const explicit = await this.prefs.listForUser(userId)
      const map = new Map(
        explicit.map((r) => [`${r.channel}|${r.category}`, r] as const),
      )
      // Materialise the full matrix with defaults so the frontend can
      // render a stable toggle grid without re-asking the server for
      // every cell.
      const all = []
      for (const channel of ALL_CHANNELS) {
        for (const category of ALL_CATEGORIES) {
          const row = map.get(`${channel}|${category}`)
          all.push(
            row ?? {
              userId,
              channel,
              category,
              optedIn: true,
              frequencyHint: 'immediate' as const,
            },
          )
        }
      }
      return { preferences: all }
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }

  @Post('preferences/update')
  async updatePreferences(@Body() body: unknown) {
    try {
      const parsed = UpdatePrefsBody.parse(body)
      const row = await this.prefs.upsert({
        userId: parsed.userId,
        channel: parsed.channel,
        category: parsed.category,
        optedIn: parsed.optedIn,
        frequencyHint: parsed.frequencyHint ?? 'immediate',
      })
      return { preference: row }
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }
}
