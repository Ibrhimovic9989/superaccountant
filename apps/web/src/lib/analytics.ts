/**
 * Product analytics — provider-agnostic event tracker.
 *
 * Today: console.log in dev, no-op in prod when no provider is configured.
 * Tomorrow: install posthog-js / @vercel/analytics / @segment/analytics-next
 * and replace the bodies of `track` + `identify` + `pageview`. Nothing else
 * in the codebase has to change.
 *
 * The whole point of this module is to give the funnel events a typed
 * vocabulary so we can answer "where are users dropping off?" without
 * archaeology through random `.track('foo')` calls.
 */

const ENABLED =
  typeof process !== 'undefined' &&
  (process.env.NEXT_PUBLIC_POSTHOG_KEY ?? process.env.NEXT_PUBLIC_ANALYTICS_KEY ?? '').length > 0

export const analyticsEnabled = ENABLED

/**
 * Funnel events — the canonical list. Adding a new one? Add it here first
 * so it's discoverable, typed, and consistently named.
 *
 * Naming convention: `<noun>_<verb_in_past_tense>`.
 * - signed_up         — first account creation
 * - market_picked     — chose India or KSA
 * - profile_completed — finished the profile setup wizard
 * - entry_test_*      — placement test funnel
 * - lesson_*          — lesson engagement
 * - tutor_message_sent
 * - grand_test_*      — final exam funnel
 * - certificate_issued
 */
export type EventName =
  | 'signed_up'
  | 'signed_in'
  | 'signed_out'
  | 'market_picked'
  | 'profile_completed'
  | 'profile_updated'
  | 'track_switched'
  | 'entry_test_started'
  | 'entry_test_question_answered'
  | 'entry_test_completed'
  | 'lesson_opened'
  | 'lesson_section_viewed'
  | 'lesson_practice_attempted'
  | 'lesson_marked_complete'
  | 'tutor_opened'
  | 'tutor_message_sent'
  | 'today_plan_opened'
  | 'today_item_clicked'
  | 'grand_test_started'
  | 'grand_test_submitted'
  | 'grand_test_passed'
  | 'certificate_issued'
  | 'certificate_downloaded'
  | 'account_deleted'
  | 'data_exported'

export type EventProps = Record<string, string | number | boolean | null | undefined>

/**
 * Track a funnel event. Always safe to call — no-op when no provider is set.
 */
export function track(event: EventName, props?: EventProps): void {
  if (typeof window === 'undefined') return // server-side: skip silently
  if (!ENABLED) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[analytics:dev]', event, props ?? {})
    }
    return
  }

  // ── To enable PostHog (recommended), replace the body below ──
  // import posthog from 'posthog-js'
  // posthog.capture(event, props)
}

/**
 * Identify the current user. Call this right after sign-in. Never include
 * email or phone — only the user id and non-PII traits like locale + market.
 */
export function identify(
  userId: string,
  traits?: { locale?: 'en' | 'ar'; market?: 'india' | 'ksa' },
): void {
  if (typeof window === 'undefined') return
  if (!ENABLED) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[analytics:dev] identify', userId, traits)
    }
    return
  }

  // ── To enable PostHog ──
  // import posthog from 'posthog-js'
  // posthog.identify(userId, traits)
}

/**
 * Reset on sign-out. Clears the local identity so the next session is
 * tracked anonymously until they sign in again.
 */
export function resetIdentity(): void {
  if (typeof window === 'undefined') return
  if (!ENABLED) return

  // ── To enable PostHog ──
  // import posthog from 'posthog-js'
  // posthog.reset()
}

/**
 * Track a pageview. With Next App Router, call this from a top-level layout
 * client wrapper that watches `usePathname()`.
 */
export function pageview(path: string): void {
  if (typeof window === 'undefined') return
  if (!ENABLED) return

  // ── To enable PostHog ──
  // import posthog from 'posthog-js'
  // posthog.capture('$pageview', { $current_url: path })
}
