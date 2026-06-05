/**
 * Audience + market rotation for the SEO/GEO blog writer agent.
 *
 * The cron fires twice daily (9 AM IST + 6 PM IST). Both runs in a given
 * day produce posts targeting the SAME audience+market — the orchestrator
 * relies on the 30-day topic-dedup table to make sure the second run of
 * the day picks a different fresh topic from the first.
 *
 * Schedule:
 *   - Mon / Wed / Fri → students
 *   - Tue / Thu       → graduates
 *   - Sat / Sun       → accountants
 *
 * Market: alternates by day-of-year — odd days → india, even → ksa.
 * This gives both markets roughly equal weekly coverage no matter which
 * audience is up. We deliberately do NOT couple market to audience —
 * KSA accountants and Indian students both deserve weekly attention.
 *
 * Pure function: no I/O, no Date.now(). The caller passes in the date.
 */

import type { AudienceSegmentKey, Market } from './types'

export type RotationResult = {
  audience: AudienceSegmentKey
  market: Market
}

/**
 * Returns the audience + market for the cron run on `date`. Pure +
 * deterministic — same input always yields the same output.
 *
 * Day-of-week is read from the date's UTC representation. We could
 * read IST instead, but the cron fires twice on every IST day at hours
 * (03:30 + 12:30 UTC) that are always inside the *same* UTC day for
 * IST (UTC+5:30), so UTC day-of-week === IST day-of-week here. No
 * surprises near midnight.
 */
export function rotate(date: Date): RotationResult {
  const dow = date.getUTCDay() // 0=Sun … 6=Sat
  const audience: AudienceSegmentKey = pickAudience(dow)
  const market: Market = pickMarket(date)
  return { audience, market }
}

/**
 * Mon (1) / Wed (3) / Fri (5) → students.
 * Tue (2) / Thu (4)           → graduates.
 * Sat (6) / Sun (0)           → accountants.
 *
 * Rationale: students are the highest-volume audience so they get 3/7
 * days. Working accountants get the weekend slots — they're more
 * likely to read longer-form regulatory deep-dives on Sat/Sun.
 */
function pickAudience(dayOfWeekUtc: number): AudienceSegmentKey {
  if (dayOfWeekUtc === 1 || dayOfWeekUtc === 3 || dayOfWeekUtc === 5) return 'students'
  if (dayOfWeekUtc === 2 || dayOfWeekUtc === 4) return 'graduates'
  // 0 (Sun) or 6 (Sat)
  return 'accountants'
}

/**
 * Market parity by day-of-year. Day 1 (Jan 1) = odd = india. Day 2 = even = ksa.
 * Uses UTC to be timezone-agnostic.
 */
function pickMarket(date: Date): Market {
  const dayOfYear = computeDayOfYearUtc(date)
  return dayOfYear % 2 === 1 ? 'india' : 'ksa'
}

/** Pure helper. 1 for Jan 1, 365/366 for Dec 31. UTC. */
function computeDayOfYearUtc(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const now = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
  return Math.floor((now - start) / 86_400_000)
}

/**
 * Returns an ISO-week-ish label like "2026-W23" usable in Perplexity
 * prompts as a temporal anchor. Pure + deterministic.
 */
export function weekLabel(date: Date): string {
  const year = date.getUTCFullYear()
  // ISO week number — approximate, no need for full ISO-8601 correction
  // since we only use this as a freshness hint inside an LLM prompt.
  const start = new Date(Date.UTC(year, 0, 1))
  const diffDays = Math.floor((date.getTime() - start.getTime()) / 86_400_000)
  const week = Math.ceil((diffDays + start.getUTCDay() + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}
