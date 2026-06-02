// TODO Phase 2: wire WhatsApp Business API.
// Recommended provider: Gupshup (India-friendly, faster onboarding) or Meta Cloud API direct.
// Steps:
//   1. Create Meta Business Manager + WhatsApp Business Account (WABA)
//   2. Verify business identity (1-3 days)
//   3. Get API key from Gupshup or generate Meta Cloud API access token
//   4. Pre-approve message templates with Meta (needed for outbound to non-24h-session users)
//   5. Set env: WHATSAPP_PROVIDER, WHATSAPP_API_KEY, WHATSAPP_FROM_NUMBER_ID
//   6. Map our 5 categories to approved template names (class_reminder_v1, daily_nudge_v1, etc.)
//   7. Replace this stub's body with the provider's send endpoint

import { Injectable } from '@nestjs/common'
import type { DeliveryResult } from '../../domain/types'
import type { ChannelAdapter, ChannelSendArgs } from './channel.adapter'

@Injectable()
export class WhatsAppChannelAdapter implements ChannelAdapter {
  readonly channel = 'whatsapp' as const

  async send(args: ChannelSendArgs): Promise<DeliveryResult> {
    console.warn('[whatsapp] not wired — see TODO in source', {
      userId: args.userId,
      category: args.category,
      title: args.payload.title,
    })
    return { status: 'stubbed', error: 'whatsapp adapter not yet implemented' }
  }
}
