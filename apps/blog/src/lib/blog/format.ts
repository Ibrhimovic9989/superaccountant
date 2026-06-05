/**
 * Small display helpers used across the public blog surface. Kept pure
 * so they're trivial to test if we ever need to.
 */

const MARKET_LABELS = {
  india: 'India',
  ksa: 'Saudi Arabia',
  global: 'Global',
} as const

export function marketLabel(market: 'india' | 'ksa' | 'global'): string {
  return MARKET_LABELS[market]
}

/** Reading time estimate at ~225 wpm. Good enough for editorial UX. */
export function readingTimeMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 225))
}

/** "3 days ago" — short relative date. Falls back to ISO date for >30d. */
export function relativeDate(date: Date | string, now: Date = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diffSec = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000))
  if (diffSec < 60) return 'just now'
  const minutes = Math.round(diffSec / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return d.toISOString().slice(0, 10)
}
