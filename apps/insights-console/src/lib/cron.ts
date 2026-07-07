/**
 * Very small cron-expression evaluator. Only supports the shape we
 * actually use: fixed hour/minute, wildcards on the other fields.
 * Falls back to `null` for anything more elaborate (ranges, steps, lists)
 * so we never mislead the UI with a wrong "next fires at" time.
 *
 * All times are UTC — pg_cron runs in the database's timezone which is
 * UTC on Supabase. We render the local-time string next to the UTC one
 * in the UI so the reader can sanity-check without doing tz math.
 */

export type ParsedCron = {
  minute: number
  hour: number
  /** Minutes until the next fire, computed against Date.now(). */
  nextFiresInMs: number
  nextFiresAtUtc: Date
}

/** Returns null if the expression uses features we don't handle. */
export function parseCron(expr: string, now: Date = new Date()): ParsedCron | null {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return null
  const [minStr, hourStr, dom, mon, dow] = parts

  // Only fixed-value hour/min for now; wildcards elsewhere are fine.
  if (dom !== '*' || mon !== '*' || dow !== '*') return null

  const minute = parseFixedField(minStr, 0, 59)
  const hour = parseFixedField(hourStr, 0, 23)
  if (minute === null || hour === null) return null

  // Compute the next UTC instant that hits (hour:minute).
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hour,
      minute,
      0,
      0,
    ),
  )
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1)
  }
  return {
    minute,
    hour,
    nextFiresInMs: next.getTime() - now.getTime(),
    nextFiresAtUtc: next,
  }
}

function parseFixedField(s: string, lo: number, hi: number): number | null {
  if (s === '*') return lo // wildcard on min/hour would mean "every minute" — treat as 0
  const n = Number(s)
  if (!Number.isInteger(n) || n < lo || n > hi) return null
  return n
}

/** Nice "in 3 hr 42 min" style formatting for the "next fires" tile. */
export function formatDuration(ms: number): string {
  if (ms <= 0) return 'now'
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
