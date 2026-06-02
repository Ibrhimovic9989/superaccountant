/**
 * Domain types for the notifications context.
 *
 * Channels are concrete delivery surfaces (in_app inbox, email, mobile
 * push, WhatsApp). Categories describe why the user is being
 * notified — the (channel × category) matrix is the user-facing
 * opt-in surface in NotificationPreference.
 *
 * Everything here is plain data: no framework imports, no I/O.
 */

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'whatsapp'

export type NotificationCategory =
  | 'class_reminder'
  | 'daily_nudge'
  | 'streak_at_risk'
  | 'weekly_progress'
  | 'system'

export type NotificationFrequencyHint = 'immediate' | 'daily_digest' | 'weekly'

export type NotificationPayload = {
  /** Short headline. Required for every channel. */
  title: string
  /** Optional body text. May be omitted for push titles-only. */
  body?: string
  /** Deep-link the user lands on if they click. App-relative or absolute. */
  link?: string
  /** Free-form extras (e.g. classId, lessonSlug) for adapter-specific use. */
  metadata?: Record<string, unknown>
}

export type DeliveryStatus = 'delivered' | 'stubbed' | 'failed'

export type DeliveryResult = {
  status: DeliveryStatus
  /** Provider-side id (Resend message id, FCM message name, etc.). */
  providerMessageId?: string
  /** Human-readable error when status='failed'. */
  error?: string
}

export const ALL_CHANNELS: readonly NotificationChannel[] = [
  'in_app',
  'email',
  'push',
  'whatsapp',
] as const

export const ALL_CATEGORIES: readonly NotificationCategory[] = [
  'class_reminder',
  'daily_nudge',
  'streak_at_risk',
  'weekly_progress',
  'system',
] as const
