/**
 * Date rehydration for values that came back from `unstable_cache`.
 *
 * Next's `unstable_cache` JSON-serializes its return value. Date objects
 * survive the round trip as ISO strings ("2027-04-09T00:00:00.000Z").
 * If a page calls `value.someField.toLocaleDateString()` on the
 * post-cache value, it crashes with "is not a function" — exactly the
 * digest 1357949470 we hit on /roadmap.
 *
 * `reviveDates` walks an arbitrarily nested object and replaces any
 * string whose key name matches a date-ish convention (`*At`, `*Date`)
 * AND parses as a valid ISO date string with `new Date(...)`. Cheap,
 * convention-driven, no schema needed. Use only on cache return values
 * — at code boundaries you control. Don't run on user input.
 */

const DATE_KEY_RE = /(At|Date)$/

export function reviveDates<T>(value: T): T {
  return revive(value) as T
}

function revive(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') return value
  if (value instanceof Date) return value
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = revive(value[i])
    return value
  }
  // biome-ignore lint/suspicious/noExplicitAny: walking an unknown object shape
  const obj = value as Record<string, any>
  for (const key of Object.keys(obj)) {
    const v = obj[key]
    if (typeof v === 'string' && DATE_KEY_RE.test(key) && isIsoDateString(v)) {
      const d = new Date(v)
      if (!Number.isNaN(d.getTime())) obj[key] = d
    } else if (v && typeof v === 'object') {
      obj[key] = revive(v)
    }
  }
  return obj
}

function isIsoDateString(s: string): boolean {
  // Matches "2027-04-09" or "2027-04-09T12:34:56.789Z" etc.
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/.test(s)
}
