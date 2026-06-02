/**
 * ChannelAdapter — the port every delivery surface implements.
 *
 * Per CLAUDE.md §3.4 (DIP): the dispatch service depends on this
 * interface; the four concrete adapters (in-app, email, push,
 * whatsapp) live under infrastructure/ and are registered in the
 * NestJS module.
 *
 * The interface is intentionally tiny — `send` takes a userId + a
 * pre-rendered payload and returns a DeliveryResult. The adapter is
 * free to resolve user-side context (email address, push token,
 * WhatsApp number) however it likes.
 *
 * OCP: new channels register a new adapter and get added to the
 * registry. Nothing in dispatch-due.service.ts changes.
 */

import type {
  DeliveryResult,
  NotificationChannel,
  NotificationCategory,
  NotificationPayload,
} from '../../domain/types'

export type ChannelSendArgs = {
  userId: string
  category: NotificationCategory
  payload: NotificationPayload
  /** Optional id of the originating ScheduledNotification row. */
  scheduledNotificationId?: string
}

export interface ChannelAdapter {
  /** The channel this adapter serves. The registry maps by this value. */
  readonly channel: NotificationChannel

  send(args: ChannelSendArgs): Promise<DeliveryResult>
}

/** Nest DI token for the registry — array of all wired adapters. */
export const CHANNEL_ADAPTER_REGISTRY = Symbol('CHANNEL_ADAPTER_REGISTRY')

/** Convenience type for the provider — Nest gives us an array. */
export type ChannelAdapterRegistry = ReadonlyArray<ChannelAdapter>
