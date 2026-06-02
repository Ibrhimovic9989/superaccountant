/**
 * NotificationPreferenceRepository — port + adapter for the
 * NotificationPreference table.
 *
 * Convention: a missing row means OPTED IN (immediate). Users only
 * end up with rows for things they've explicitly toggled. That keeps
 * onboarding-friendly defaults without requiring us to seed a row
 * per (user × channel × category) on signup.
 */

import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { prisma } from '@sa/db'
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationFrequencyHint,
} from '../domain/types'

export type PreferenceRow = {
  userId: string
  channel: NotificationChannel
  category: NotificationCategory
  optedIn: boolean
  frequencyHint: NotificationFrequencyHint
}

export const PREFERENCE_REPOSITORY = Symbol('PREFERENCE_REPOSITORY')

export interface PreferenceRepository {
  /** Resolve a single preference. Returns default-on row when absent. */
  resolve(
    userId: string,
    channel: NotificationChannel,
    category: NotificationCategory,
  ): Promise<PreferenceRow>

  /** Fetch all rows the user has explicitly toggled. */
  listForUser(userId: string): Promise<PreferenceRow[]>

  /** Upsert a row. */
  upsert(input: PreferenceRow): Promise<PreferenceRow>
}

@Injectable()
export class PrismaPreferenceRepository implements PreferenceRepository {
  async resolve(
    userId: string,
    channel: NotificationChannel,
    category: NotificationCategory,
  ): Promise<PreferenceRow> {
    const rows = await prisma.$queryRaw<RawRow[]>`
      SELECT "userId","channel","category","optedIn","frequencyHint"
      FROM "NotificationPreference"
      WHERE "userId" = ${userId} AND "channel" = ${channel} AND "category" = ${category}
      LIMIT 1
    `
    if (rows[0]) return castRow(rows[0])
    // Default: opted in, immediate frequency.
    return { userId, channel, category, optedIn: true, frequencyHint: 'immediate' }
  }

  async listForUser(userId: string): Promise<PreferenceRow[]> {
    const rows = await prisma.$queryRaw<RawRow[]>`
      SELECT "userId","channel","category","optedIn","frequencyHint"
      FROM "NotificationPreference"
      WHERE "userId" = ${userId}
    `
    return rows.map(castRow)
  }

  async upsert(input: PreferenceRow): Promise<PreferenceRow> {
    const id = randomUUID()
    await prisma.$executeRaw`
      INSERT INTO "NotificationPreference"
        ("id","userId","channel","category","optedIn","frequencyHint","updatedAt")
      VALUES
        (${id}, ${input.userId}, ${input.channel}, ${input.category},
         ${input.optedIn}, ${input.frequencyHint}, NOW())
      ON CONFLICT ("userId","channel","category")
      DO UPDATE SET
        "optedIn" = EXCLUDED."optedIn",
        "frequencyHint" = EXCLUDED."frequencyHint",
        "updatedAt" = NOW()
    `
    return input
  }
}

type RawRow = {
  userId: string
  channel: string
  category: string
  optedIn: boolean
  frequencyHint: string
}

function castRow(r: RawRow): PreferenceRow {
  return {
    userId: r.userId,
    channel: r.channel as NotificationChannel,
    category: r.category as NotificationCategory,
    optedIn: r.optedIn,
    frequencyHint: r.frequencyHint as NotificationFrequencyHint,
  }
}
