/**
 * EmailChannelAdapter — renders the generic notification template,
 * looks up the user's email, and sends via @sa/email (Resend).
 *
 * Works end-to-end today. If the user has no email row we record a
 * failed delivery rather than throwing — the dispatcher batch must
 * keep going even when an individual user is malformed.
 */

import { Injectable } from '@nestjs/common'
import { prisma } from '@sa/db'
import { buildGenericNotificationEmail, sendEmail } from '@sa/email'
import type { DeliveryResult } from '../../domain/types'
import type { ChannelAdapter, ChannelSendArgs } from './channel.adapter'

@Injectable()
export class EmailChannelAdapter implements ChannelAdapter {
  readonly channel = 'email' as const

  async send(args: ChannelSendArgs): Promise<DeliveryResult> {
    const user = await prisma.identityUser.findUnique({
      where: { id: args.userId },
      select: { email: true, name: true, locale: true },
    })
    if (!user?.email) {
      return { status: 'failed', error: 'user has no email on record' }
    }

    const { subject, html, text } = buildGenericNotificationEmail({
      recipientName: user.name ?? user.email,
      recipientEmail: user.email,
      title: args.payload.title,
      body: args.payload.body,
      link: args.payload.link,
      locale: user.locale,
    })

    try {
      const res = await sendEmail({ to: user.email, subject, html, text })
      return { status: 'delivered', providerMessageId: res.id }
    } catch (err) {
      return { status: 'failed', error: (err as Error).message }
    }
  }
}
