/**
 * ScheduledNotificationRepository — port + adapter for the
 * ScheduledNotification queue and the NotificationDelivery audit log.
 *
 * Kept thin on purpose. The scheduler logic lives in the application
 * layer; this file is pure I/O.
 */

import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { prisma } from '@sa/db'
import type {
  DeliveryResult,
  DeliveryStatus,
  NotificationCategory,
  NotificationChannel,
  NotificationPayload,
} from '../domain/types'

export type ScheduleInsert = {
  userId: string
  channel: NotificationChannel
  category: NotificationCategory
  payload: NotificationPayload
  scheduledAt: Date
}

export type DueRow = {
  id: string
  userId: string
  channel: NotificationChannel
  category: NotificationCategory
  payload: NotificationPayload
  scheduledAt: Date
}

export type FinaliseStatus = 'sent' | 'failed' | 'skipped_opt_out' | 'cancelled'

export const SCHEDULED_REPOSITORY = Symbol('SCHEDULED_REPOSITORY')

export interface ScheduledRepository {
  insert(input: ScheduleInsert): Promise<string>
  /** Pick at most `limit` due rows; ordered oldest first. */
  pickDue(now: Date, limit: number): Promise<DueRow[]>
  /** Move a row to terminal status; sentAt set on success/stub. */
  finalise(args: {
    id: string
    status: FinaliseStatus
    error?: string
  }): Promise<void>
  /** Append-only audit log entry for one dispatch attempt. */
  recordDelivery(args: {
    scheduledNotificationId: string
    userId: string
    channel: NotificationChannel
    result: DeliveryResult
  }): Promise<void>
}

@Injectable()
export class PrismaScheduledRepository implements ScheduledRepository {
  async insert(input: ScheduleInsert): Promise<string> {
    const id = randomUUID()
    // Prisma maps JS objects to JSONB cleanly via tagged template.
    await prisma.$executeRaw`
      INSERT INTO "ScheduledNotification"
        ("id","userId","channel","category","payload","scheduledAt","status")
      VALUES
        (${id}, ${input.userId}, ${input.channel}, ${input.category},
         ${JSON.stringify(input.payload)}::jsonb,
         ${input.scheduledAt}, 'pending')
    `
    return id
  }

  async pickDue(now: Date, limit: number): Promise<DueRow[]> {
    const rows = await prisma.$queryRaw<RawDue[]>`
      SELECT "id","userId","channel","category","payload","scheduledAt"
      FROM "ScheduledNotification"
      WHERE "status" = 'pending' AND "scheduledAt" <= ${now}
      ORDER BY "scheduledAt" ASC
      LIMIT ${limit}
    `
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      channel: r.channel as NotificationChannel,
      category: r.category as NotificationCategory,
      payload: r.payload as NotificationPayload,
      scheduledAt: r.scheduledAt,
    }))
  }

  async finalise(args: {
    id: string
    status: FinaliseStatus
    error?: string
  }): Promise<void> {
    const setSentAt = args.status === 'sent'
    if (setSentAt) {
      await prisma.$executeRaw`
        UPDATE "ScheduledNotification"
        SET "status" = ${args.status}, "sentAt" = NOW(),
            "error" = ${args.error ?? null}
        WHERE "id" = ${args.id} AND "status" = 'pending'
      `
    } else {
      await prisma.$executeRaw`
        UPDATE "ScheduledNotification"
        SET "status" = ${args.status}, "error" = ${args.error ?? null}
        WHERE "id" = ${args.id} AND "status" = 'pending'
      `
    }
  }

  async recordDelivery(args: {
    scheduledNotificationId: string
    userId: string
    channel: NotificationChannel
    result: DeliveryResult
  }): Promise<void> {
    const id = randomUUID()
    const status: DeliveryStatus = args.result.status
    await prisma.$executeRaw`
      INSERT INTO "NotificationDelivery"
        ("id","scheduledNotificationId","userId","channel",
         "providerMessageId","status","error")
      VALUES
        (${id}, ${args.scheduledNotificationId}, ${args.userId}, ${args.channel},
         ${args.result.providerMessageId ?? null}, ${status},
         ${args.result.error ?? null})
    `
  }
}

type RawDue = {
  id: string
  userId: string
  channel: string
  category: string
  payload: unknown
  scheduledAt: Date
}
