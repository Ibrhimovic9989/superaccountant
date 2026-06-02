/**
 * Pure unit tests for the dispatch loop. Repositories and channel
 * adapters are in-memory fakes so we lock down the orchestration
 * logic without touching Postgres / Resend.
 */

import { describe, expect, it } from 'vitest'
import { DispatchDueNotifications } from './dispatch-due.service'
import type {
  ChannelAdapter,
  ChannelSendArgs,
} from '../infrastructure/channels/channel.adapter'
import type {
  PreferenceRepository,
  PreferenceRow,
} from '../infrastructure/preferences.repository'
import type {
  DueRow,
  FinaliseStatus,
  ScheduleInsert,
  ScheduledRepository,
} from '../infrastructure/scheduled.repository'
import type {
  DeliveryResult,
  NotificationCategory,
  NotificationChannel,
} from '../domain/types'

class InMemoryPrefs implements PreferenceRepository {
  private optOuts = new Set<string>()
  optOut(userId: string, channel: NotificationChannel, category: NotificationCategory) {
    this.optOuts.add(`${userId}|${channel}|${category}`)
  }
  async resolve(
    userId: string,
    channel: NotificationChannel,
    category: NotificationCategory,
  ): Promise<PreferenceRow> {
    const optedIn = !this.optOuts.has(`${userId}|${channel}|${category}`)
    return { userId, channel, category, optedIn, frequencyHint: 'immediate' }
  }
  async listForUser(): Promise<PreferenceRow[]> {
    return []
  }
  async upsert(input: PreferenceRow): Promise<PreferenceRow> {
    return input
  }
}

type FakeDispatch = {
  scheduledNotificationId: string
  userId: string
  channel: NotificationChannel
  result: DeliveryResult
}

class InMemoryQueue implements ScheduledRepository {
  rows: (DueRow & { status: 'pending' | FinaliseStatus; error?: string })[] = []
  deliveries: FakeDispatch[] = []
  private counter = 0

  push(input: ScheduleInsert): string {
    const id = `q-${++this.counter}`
    this.rows.push({ ...input, id, status: 'pending' })
    return id
  }

  async insert(input: ScheduleInsert): Promise<string> {
    return this.push(input)
  }

  async pickDue(now: Date, limit: number): Promise<DueRow[]> {
    return this.rows
      .filter((r) => r.status === 'pending' && r.scheduledAt.getTime() <= now.getTime())
      .slice(0, limit)
      .map((r) => ({
        id: r.id,
        userId: r.userId,
        channel: r.channel,
        category: r.category,
        payload: r.payload,
        scheduledAt: r.scheduledAt,
      }))
  }

  async finalise(args: { id: string; status: FinaliseStatus; error?: string }): Promise<void> {
    const row = this.rows.find((r) => r.id === args.id)
    if (row && row.status === 'pending') {
      row.status = args.status
      row.error = args.error
    }
  }

  async recordDelivery(args: FakeDispatch): Promise<void> {
    this.deliveries.push(args)
  }
}

class FakeAdapter implements ChannelAdapter {
  calls: ChannelSendArgs[] = []
  constructor(
    readonly channel: NotificationChannel,
    private readonly behaviour: 'deliver' | 'stub' | 'fail' | 'throw',
  ) {}
  async send(args: ChannelSendArgs): Promise<DeliveryResult> {
    this.calls.push(args)
    if (this.behaviour === 'throw') throw new Error('boom')
    if (this.behaviour === 'fail') return { status: 'failed', error: 'rejected' }
    if (this.behaviour === 'stub') return { status: 'stubbed' }
    return { status: 'delivered', providerMessageId: 'msg-1' }
  }
}

function makeSubject(
  queue: InMemoryQueue,
  prefs: InMemoryPrefs,
  adapters: ChannelAdapter[],
): DispatchDueNotifications {
  return new DispatchDueNotifications(queue, prefs, adapters)
}

describe('DispatchDueNotifications', () => {
  const fixedNow = new Date('2026-06-01T12:00:00Z')
  const past = new Date('2026-06-01T11:00:00Z')

  it('dispatches a pending row to the matching adapter and marks sent', async () => {
    const queue = new InMemoryQueue()
    const prefs = new InMemoryPrefs()
    const inApp = new FakeAdapter('in_app', 'deliver')
    queue.push({
      userId: 'u1',
      channel: 'in_app',
      category: 'class_reminder',
      payload: { title: 'hi' },
      scheduledAt: past,
    })

    const subject = makeSubject(queue, prefs, [inApp])
    const summary = await subject.execute(fixedNow)

    expect(summary).toEqual({
      processed: 1,
      delivered: 1,
      stubbed: 0,
      failed: 0,
      skippedOptOut: 0,
    })
    expect(inApp.calls).toHaveLength(1)
    expect(queue.rows[0]?.status).toBe('sent')
    expect(queue.deliveries[0]?.result.status).toBe('delivered')
  })

  it('skips users who opted out without calling the adapter', async () => {
    const queue = new InMemoryQueue()
    const prefs = new InMemoryPrefs()
    prefs.optOut('u1', 'email', 'daily_nudge')
    const email = new FakeAdapter('email', 'deliver')
    queue.push({
      userId: 'u1',
      channel: 'email',
      category: 'daily_nudge',
      payload: { title: 'lesson' },
      scheduledAt: past,
    })

    const subject = makeSubject(queue, prefs, [email])
    const summary = await subject.execute(fixedNow)

    expect(summary.skippedOptOut).toBe(1)
    expect(summary.delivered).toBe(0)
    expect(email.calls).toHaveLength(0)
    expect(queue.rows[0]?.status).toBe('skipped_opt_out')
    expect(queue.deliveries).toHaveLength(0)
  })

  it('records stubbed adapters as work-done so the row does not re-fire', async () => {
    const queue = new InMemoryQueue()
    const prefs = new InMemoryPrefs()
    const push = new FakeAdapter('push', 'stub')
    queue.push({
      userId: 'u1',
      channel: 'push',
      category: 'streak_at_risk',
      payload: { title: 'streak' },
      scheduledAt: past,
    })

    const subject = makeSubject(queue, prefs, [push])
    const summary = await subject.execute(fixedNow)

    expect(summary.stubbed).toBe(1)
    expect(queue.rows[0]?.status).toBe('sent')
    expect(queue.deliveries[0]?.result.status).toBe('stubbed')
  })

  it('captures adapter failures without killing the batch', async () => {
    const queue = new InMemoryQueue()
    const prefs = new InMemoryPrefs()
    const flaky = new FakeAdapter('email', 'throw')
    const ok = new FakeAdapter('in_app', 'deliver')
    queue.push({
      userId: 'u1',
      channel: 'email',
      category: 'system',
      payload: { title: 'bad' },
      scheduledAt: past,
    })
    queue.push({
      userId: 'u2',
      channel: 'in_app',
      category: 'system',
      payload: { title: 'ok' },
      scheduledAt: past,
    })

    const subject = makeSubject(queue, prefs, [flaky, ok])
    const summary = await subject.execute(fixedNow)

    expect(summary.processed).toBe(2)
    expect(summary.failed).toBe(1)
    expect(summary.delivered).toBe(1)
    expect(queue.rows[0]?.status).toBe('failed')
    expect(queue.rows[0]?.error).toBe('boom')
    expect(queue.rows[1]?.status).toBe('sent')
    // A failed dispatch still records an audit row so we can debug.
    expect(queue.deliveries.find((d) => d.userId === 'u1')?.result.status).toBe('failed')
  })

  it('is idempotent — a second run finds no pending rows', async () => {
    const queue = new InMemoryQueue()
    const prefs = new InMemoryPrefs()
    const inApp = new FakeAdapter('in_app', 'deliver')
    queue.push({
      userId: 'u1',
      channel: 'in_app',
      category: 'weekly_progress',
      payload: { title: 'recap' },
      scheduledAt: past,
    })

    const subject = makeSubject(queue, prefs, [inApp])
    await subject.execute(fixedNow)
    const second = await subject.execute(fixedNow)

    expect(second.processed).toBe(0)
    expect(inApp.calls).toHaveLength(1)
  })

  it('marks failed when no adapter is registered for the channel', async () => {
    const queue = new InMemoryQueue()
    const prefs = new InMemoryPrefs()
    queue.push({
      userId: 'u1',
      channel: 'whatsapp',
      category: 'class_reminder',
      payload: { title: 'class' },
      scheduledAt: past,
    })

    const subject = makeSubject(queue, prefs, []) // empty registry
    const summary = await subject.execute(fixedNow)

    expect(summary.failed).toBe(1)
    expect(queue.rows[0]?.status).toBe('failed')
    expect(queue.rows[0]?.error).toContain("no adapter registered")
  })

  it('does not pick rows whose scheduledAt is in the future', async () => {
    const queue = new InMemoryQueue()
    const prefs = new InMemoryPrefs()
    const inApp = new FakeAdapter('in_app', 'deliver')
    queue.push({
      userId: 'u1',
      channel: 'in_app',
      category: 'system',
      payload: { title: 'later' },
      scheduledAt: new Date('2026-06-02T00:00:00Z'),
    })

    const subject = makeSubject(queue, prefs, [inApp])
    const summary = await subject.execute(fixedNow)

    expect(summary.processed).toBe(0)
    expect(queue.rows[0]?.status).toBe('pending')
  })
})
