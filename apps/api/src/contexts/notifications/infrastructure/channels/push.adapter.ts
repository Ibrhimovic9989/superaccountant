// TODO Phase 2: wire FCM (Firebase Cloud Messaging) or Expo Push.
// Steps:
//   1. Create a Firebase project at https://console.firebase.google.com
//   2. Generate a service account key → download JSON
//   3. Set env: FCM_PROJECT_ID, FCM_SERVICE_ACCOUNT_JSON (base64-encoded)
//   4. Add web push registration to apps/web (collect FCM tokens on login)
//   5. Add a UserPushToken table to store per-user tokens
//   6. Replace this stub's body with a call to https://fcm.googleapis.com/v1/projects/{PROJECT}/messages:send
// No other code path needs to change — the adapter interface contract stays the same.

import { Injectable } from '@nestjs/common'
import type { DeliveryResult } from '../../domain/types'
import type { ChannelAdapter, ChannelSendArgs } from './channel.adapter'

@Injectable()
export class PushChannelAdapter implements ChannelAdapter {
  readonly channel = 'push' as const

  async send(args: ChannelSendArgs): Promise<DeliveryResult> {
    console.warn('[push] not wired — see TODO in source', {
      userId: args.userId,
      category: args.category,
      title: args.payload.title,
    })
    return { status: 'stubbed', error: 'push adapter not yet implemented' }
  }
}
