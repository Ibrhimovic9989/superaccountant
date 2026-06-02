/**
 * DispatchDueNotifications — the scheduler.
 *
 * Called periodically (Supabase cron → POST /notifications/dispatch-due).
 * Picks up to 200 pending ScheduledNotification rows whose scheduledAt is
 * in the past, checks each user's NotificationPreference for the
 * (channel, category), then either dispatches via the channel adapter
 * registry or marks the row 'skipped_opt_out'.
 *
 * Idempotency: rows are claimed by transitioning status pending → sent /
 * failed / skipped_opt_out under a WHERE status='pending' guard. A second
 * concurrent run sees the row no longer pending and skips it.
 *
 * Per-row try/catch — one failed adapter call never kills the batch.
 */

import { Inject, Injectable } from '@nestjs/common'
import {
  CHANNEL_ADAPTER_REGISTRY,
  type ChannelAdapter,
  type ChannelAdapterRegistry,
} from '../infrastructure/channels/channel.adapter'
import {
  PREFERENCE_REPOSITORY,
  type PreferenceRepository,
} from '../infrastructure/preferences.repository'
import {
  SCHEDULED_REPOSITORY,
  type DueRow,
  type ScheduledRepository,
} from '../infrastructure/scheduled.repository'
import type { DeliveryResult, NotificationChannel } from '../domain/types'

export type DispatchSummary = {
  processed: number
  delivered: number
  stubbed: number
  failed: number
  skippedOptOut: number
}

export const DISPATCH_DUE_SERVICE = Symbol('DISPATCH_DUE_SERVICE')

const DEFAULT_BATCH_SIZE = 200

@Injectable()
export class DispatchDueNotifications {
  constructor(
    @Inject(SCHEDULED_REPOSITORY) private readonly queue: ScheduledRepository,
    @Inject(PREFERENCE_REPOSITORY) private readonly prefs: PreferenceRepository,
    @Inject(CHANNEL_ADAPTER_REGISTRY) private readonly adapters: ChannelAdapterRegistry,
  ) {}

  async execute(now: Date = new Date(), batchSize: number = DEFAULT_BATCH_SIZE): Promise<DispatchSummary> {
    const due = await this.queue.pickDue(now, batchSize)
    const summary: DispatchSummary = {
      processed: 0,
      delivered: 0,
      stubbed: 0,
      failed: 0,
      skippedOptOut: 0,
    }

    for (const row of due) {
      summary.processed += 1
      try {
        await this.dispatchOne(row, summary)
      } catch (err) {
        // Hard belt-and-braces — even repository failures shouldn't kill
        // the batch. Mark this row failed and move on.
        summary.failed += 1
        await safeFinalise(this.queue, row.id, 'failed', (err as Error).message)
      }
    }

    return summary
  }

  private async dispatchOne(row: DueRow, summary: DispatchSummary): Promise<void> {
    const pref = await this.prefs.resolve(row.userId, row.channel, row.category)
    if (!pref.optedIn) {
      summary.skippedOptOut += 1
      await this.queue.finalise({ id: row.id, status: 'skipped_opt_out' })
      return
    }

    const adapter = findAdapter(this.adapters, row.channel)
    if (!adapter) {
      summary.failed += 1
      await this.queue.finalise({
        id: row.id,
        status: 'failed',
        error: `no adapter registered for channel '${row.channel}'`,
      })
      return
    }

    let result: DeliveryResult
    try {
      result = await adapter.send({
        userId: row.userId,
        category: row.category,
        payload: row.payload,
        scheduledNotificationId: row.id,
      })
    } catch (err) {
      result = { status: 'failed', error: (err as Error).message }
    }

    await this.queue.recordDelivery({
      scheduledNotificationId: row.id,
      userId: row.userId,
      channel: row.channel,
      result,
    })

    if (result.status === 'delivered') {
      summary.delivered += 1
      await this.queue.finalise({ id: row.id, status: 'sent' })
    } else if (result.status === 'stubbed') {
      summary.stubbed += 1
      // Stubbed counts as work-done for the queue — otherwise the row
      // would re-fire on every cron tick until the real adapter ships.
      await this.queue.finalise({ id: row.id, status: 'sent' })
    } else {
      summary.failed += 1
      await this.queue.finalise({ id: row.id, status: 'failed', error: result.error })
    }
  }
}

function findAdapter(
  registry: ChannelAdapterRegistry,
  channel: NotificationChannel,
): ChannelAdapter | undefined {
  for (const a of registry) if (a.channel === channel) return a
  return undefined
}

async function safeFinalise(
  queue: ScheduledRepository,
  id: string,
  status: 'failed',
  error: string,
): Promise<void> {
  try {
    await queue.finalise({ id, status, error })
  } catch (err) {
    console.error('[notifications] finalise after error failed', {
      id,
      err: (err as Error).message,
    })
  }
}
