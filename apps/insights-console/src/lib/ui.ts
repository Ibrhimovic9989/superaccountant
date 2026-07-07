import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...args: ClassValue[]): string {
  return twMerge(clsx(args))
}

/** e.g. 12345 → "12.3k". Two significant figures for the tiles. */
export function compactNumber(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs < 1000) return String(Math.round(n))
  if (abs < 1_000_000) return `${(n / 1000).toFixed(abs < 10_000 ? 1 : 0)}k`
  return `${(n / 1_000_000).toFixed(abs < 10_000_000 ? 1 : 0)}M`
}

/** Percent formatter that respects "0" and clamps to 1 decimal. */
export function percent(v: number): string {
  if (!Number.isFinite(v)) return '—'
  return `${(v * 100).toFixed(1)}%`
}

/** "12 hr ago" / "3 days ago" style. `null` → "—". */
export function timeAgo(d: Date | string | null): string {
  if (!d) return '—'
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime()
  if (!Number.isFinite(t)) return '—'
  const diff = Date.now() - t
  const min = Math.round(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ago`
  const mo = Math.round(day / 30)
  return `${mo}mo ago`
}
