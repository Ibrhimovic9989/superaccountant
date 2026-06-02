/**
 * NotificationsService — the public trigger API other contexts call to
 * queue a notification. They never write to ScheduledNotification
 * directly; they call a verb on this service.
 *
 * The four convenience methods cover the four user-facing categories
 * we ship in Phase 1. They each fan out across the channels the
 * category usually wants: e.g. a class reminder fires on in_app +
 * email + push. The user's NotificationPreference is checked at
 * dispatch time, so opting out of one channel still keeps the other
 * channels firing.
 */

import { Inject, Injectable } from '@nestjs/common'
import {
  SCHEDULED_REPOSITORY,
  type ScheduledRepository,
} from '../infrastructure/scheduled.repository'
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPayload,
} from '../domain/types'

export type ScheduleArgs = {
  userId: string
  channel: NotificationChannel
  category: NotificationCategory
  payload: NotificationPayload
  scheduledAt: Date
}

export const NOTIFICATIONS_SERVICE = Symbol('NOTIFICATIONS_SERVICE')

/** T-30min lead time for class reminders. */
const CLASS_REMINDER_LEAD_MS = 30 * 60 * 1000

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(SCHEDULED_REPOSITORY) private readonly queue: ScheduledRepository,
  ) {}

  /** Generic queue entrypoint. Returns the new ScheduledNotification id. */
  async schedule(args: ScheduleArgs): Promise<string> {
    return this.queue.insert(args)
  }

  /**
   * Class reminder — fires 30 minutes before classStartAt on in_app,
   * email, and push. (WhatsApp is intentionally omitted by default
   * because it requires template pre-approval; callers can opt in.)
   */
  async scheduleClassReminder(args: {
    userId: string
    classStartAt: Date
    classTitle: string
    classLink?: string
  }): Promise<string[]> {
    const scheduledAt = new Date(args.classStartAt.getTime() - CLASS_REMINDER_LEAD_MS)
    const payload: NotificationPayload = {
      title: `Class starts in 30 min: ${args.classTitle}`,
      body: `Your live class "${args.classTitle}" begins at ${formatTime(args.classStartAt)}. Tap to join.`,
      link: args.classLink,
      metadata: { classStartAt: args.classStartAt.toISOString() },
    }
    return this.scheduleAcross({
      userId: args.userId,
      category: 'class_reminder',
      channels: ['in_app', 'email', 'push'],
      payload,
      scheduledAt,
    })
  }

  /** Daily nudge — "you haven't done today's assignment yet". */
  async scheduleDailyNudge(args: {
    userId: string
    sendAt: Date
    title?: string
    body?: string
    link?: string
  }): Promise<string[]> {
    const payload: NotificationPayload = {
      title: args.title ?? "Today's lesson is ready",
      body:
        args.body ??
        "10 minutes is enough — keep your streak alive and pick up where you left off.",
      link: args.link,
    }
    return this.scheduleAcross({
      userId: args.userId,
      category: 'daily_nudge',
      channels: ['in_app', 'email', 'push'],
      payload,
      scheduledAt: args.sendAt,
    })
  }

  /** Streak-at-risk — fired by the streaks job a few hours before midnight. */
  async scheduleStreakAtRiskWarning(args: {
    userId: string
    streakDays: number
    sendAt?: Date
    link?: string
  }): Promise<string[]> {
    const payload: NotificationPayload = {
      title: `Your ${args.streakDays}-day streak is at risk`,
      body: `One short lesson keeps it alive. It only takes a few minutes.`,
      link: args.link,
      metadata: { streakDays: args.streakDays },
    }
    return this.scheduleAcross({
      userId: args.userId,
      category: 'streak_at_risk',
      channels: ['in_app', 'push'],
      payload,
      scheduledAt: args.sendAt ?? new Date(),
    })
  }

  /** Weekly progress digest — email-only by default. */
  async scheduleWeeklyProgress(args: {
    userId: string
    sendAt: Date
    title?: string
    body?: string
    link?: string
  }): Promise<string[]> {
    const payload: NotificationPayload = {
      title: args.title ?? 'Your week in review',
      body:
        args.body ??
        'Here is what you completed this week and what to focus on next.',
      link: args.link,
    }
    return this.scheduleAcross({
      userId: args.userId,
      category: 'weekly_progress',
      channels: ['email', 'in_app'],
      payload,
      scheduledAt: args.sendAt,
    })
  }

  private async scheduleAcross(args: {
    userId: string
    category: NotificationCategory
    channels: NotificationChannel[]
    payload: NotificationPayload
    scheduledAt: Date
  }): Promise<string[]> {
    const ids: string[] = []
    for (const channel of args.channels) {
      const id = await this.queue.insert({
        userId: args.userId,
        channel,
        category: args.category,
        payload: args.payload,
        scheduledAt: args.scheduledAt,
      })
      ids.push(id)
    }
    return ids
  }
}

function formatTime(d: Date): string {
  // Keep it simple — adapter-side templates will localise; the
  // payload body is a sensible English fallback.
  const hh = d.getUTCHours().toString().padStart(2, '0')
  const mm = d.getUTCMinutes().toString().padStart(2, '0')
  return `${hh}:${mm} UTC`
}
