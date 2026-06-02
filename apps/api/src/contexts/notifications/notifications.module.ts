/**
 * Notifications context — Phase 1 wiring.
 *
 * Channels: in_app (works), email (works), push (stub), whatsapp (stub).
 * The four adapters are registered behind CHANNEL_ADAPTER_REGISTRY so
 * the dispatcher discovers them by interface, not import. Adding a
 * fifth channel later means dropping a new adapter + adding it to the
 * registry array — nothing else changes.
 *
 * Exports the NOTIFICATIONS_SERVICE trigger API so other contexts can
 * DI-inject it (learning will use it for streak warnings, assessment
 * for class reminders, etc.).
 */

import { Module } from '@nestjs/common'
import {
  DispatchDueNotifications,
  DISPATCH_DUE_SERVICE,
} from './application/dispatch-due.service'
import {
  NotificationsService,
  NOTIFICATIONS_SERVICE,
} from './application/notifications.service'
import { NotificationsController } from './interface/notifications.controller'
import {
  CHANNEL_ADAPTER_REGISTRY,
  type ChannelAdapter,
} from './infrastructure/channels/channel.adapter'
import { EmailChannelAdapter } from './infrastructure/channels/email.adapter'
import { InAppChannelAdapter } from './infrastructure/channels/in-app.adapter'
import { PushChannelAdapter } from './infrastructure/channels/push.adapter'
import { WhatsAppChannelAdapter } from './infrastructure/channels/whatsapp.adapter'
import {
  PrismaPreferenceRepository,
  PREFERENCE_REPOSITORY,
} from './infrastructure/preferences.repository'
import {
  PrismaScheduledRepository,
  SCHEDULED_REPOSITORY,
} from './infrastructure/scheduled.repository'

@Module({
  imports: [],
  controllers: [NotificationsController],
  providers: [
    // Channel adapters — also exposed individually so they can be
    // re-used from other modules (e.g. one-off transactional emails).
    InAppChannelAdapter,
    EmailChannelAdapter,
    PushChannelAdapter,
    WhatsAppChannelAdapter,
    {
      provide: CHANNEL_ADAPTER_REGISTRY,
      inject: [InAppChannelAdapter, EmailChannelAdapter, PushChannelAdapter, WhatsAppChannelAdapter],
      useFactory: (
        inApp: InAppChannelAdapter,
        email: EmailChannelAdapter,
        push: PushChannelAdapter,
        whatsapp: WhatsAppChannelAdapter,
      ): ChannelAdapter[] => [inApp, email, push, whatsapp],
    },

    // Repositories — ports + adapters.
    { provide: PREFERENCE_REPOSITORY, useClass: PrismaPreferenceRepository },
    { provide: SCHEDULED_REPOSITORY, useClass: PrismaScheduledRepository },

    // Application services.
    { provide: DISPATCH_DUE_SERVICE, useClass: DispatchDueNotifications },
    { provide: NOTIFICATIONS_SERVICE, useClass: NotificationsService },
  ],
  exports: [NOTIFICATIONS_SERVICE],
})
export class NotificationsModule {}
