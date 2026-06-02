/**
 * Public barrel for the notifications context. Other contexts
 * (learning, assessment, identity) import the trigger API from here.
 */

export { NotificationsService, NOTIFICATIONS_SERVICE } from './application/notifications.service'
export type { ScheduleArgs } from './application/notifications.service'
export { DISPATCH_DUE_SERVICE } from './application/dispatch-due.service'
export type { DispatchSummary } from './application/dispatch-due.service'
export type {
  NotificationCategory,
  NotificationChannel,
  NotificationFrequencyHint,
  NotificationPayload,
  DeliveryResult,
  DeliveryStatus,
} from './domain/types'
export { NotificationsModule } from './notifications.module'
