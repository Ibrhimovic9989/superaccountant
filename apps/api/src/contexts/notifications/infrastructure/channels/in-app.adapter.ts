/**
 * InAppChannelAdapter — writes a NotificationInbox row.
 *
 * This is the "bell-dropdown" surface in the Phase 2 frontend. Until
 * that UI ships, rows accumulate silently and become visible the
 * moment the dropdown component is wired up — zero migration cost.
 */

import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { prisma } from '@sa/db'
import type { DeliveryResult } from '../../domain/types'
import type { ChannelAdapter, ChannelSendArgs } from './channel.adapter'

@Injectable()
export class InAppChannelAdapter implements ChannelAdapter {
  readonly channel = 'in_app' as const

  async send(args: ChannelSendArgs): Promise<DeliveryResult> {
    const id = randomUUID()
    const body = args.payload.body ?? null
    const link = args.payload.link ?? null
    await prisma.$executeRaw`
      INSERT INTO "NotificationInbox"
        ("id", "userId", "title", "body", "link", "category")
      VALUES
        (${id}, ${args.userId}, ${args.payload.title}, ${body}, ${link}, ${args.category})
    `
    return { status: 'delivered', providerMessageId: id }
  }
}
