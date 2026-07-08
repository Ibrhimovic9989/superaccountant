/**
 * Number/date/URL formatters shared across dashboard tiles + tables.
 * Kept as one file so a designer tweak (compact style, precision) lands
 * in one place instead of six components.
 */

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-IN')
}

export function fmtPercent(v: number, decimals = 1): string {
  return `${(v * 100).toFixed(decimals)}%`
}

/**
 * "1.2K", "8.4M". For stat tiles where we want a glanceable number.
 * Falls back to a plain integer under 1000.
 */
export function fmtCompact(n: number): string {
  if (Math.abs(n) < 1000) return String(Math.round(n))
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function fmtRelative(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = d instanceof Date ? d : new Date(d)
  const diff = Date.now() - date.getTime()
  if (Number.isNaN(diff)) return '—'
  const min = Math.round(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.round(h / 24)
  return `${days}d ago`
}

/**
 * GSC returns the full URL for the "page" dimension while GA4 emits just
 * the path. This produces a compact display common to both.
 */
export function shortPath(urlOrPath: string): string {
  if (!urlOrPath) return '—'
  const path = urlOrPath.replace(/^https?:\/\/[^/]+/, '')
  if (path === '' || path === '/') return '/'
  return path.length > 60 ? `${path.slice(0, 57)}…` : path
}
