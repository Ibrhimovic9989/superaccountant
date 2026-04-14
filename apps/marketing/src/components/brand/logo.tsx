import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Brand system — logomark + wordmark + combined logo.
 *
 * Wordmark: 'Superaccountant' with the aurora gradient (same as the
 * marketing hero "accounting tutor"). The gradient animates fg → accent
 * → fg → accent on a 6s shine loop via `.aurora-text` in globals.css.
 *
 * Logomark: stylized T-account (the foundation of double-entry
 * bookkeeping). A rounded square frame with a horizontal bar at the top,
 * a vertical divider splitting the bottom into Dr | Cr columns, and four
 * small entry blocks inside — instantly readable as "ledger" to anyone
 * in finance.
 */

// ─── Logomark — T-Account ───────────────────────────────────

type MarkProps = {
  size?: number
  className?: string
}

export function Logomark({ size = 28, className }: MarkProps) {
  const gradId = React.useId()
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--fg)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>

      {/* Outer rounded frame — the ledger card */}
      <rect
        x="3"
        y="3"
        width="26"
        height="26"
        rx="6"
        stroke={`url(#${gradId})`}
        strokeWidth="2"
        fill="none"
      />

      {/* Top horizontal bar — the account-name divider */}
      <line
        x1="3"
        y1="11"
        x2="29"
        y2="11"
        stroke={`url(#${gradId})`}
        strokeWidth="2"
      />

      {/* Vertical divider — splits Dr | Cr */}
      <line
        x1="16"
        y1="11"
        x2="16"
        y2="29"
        stroke={`url(#${gradId})`}
        strokeWidth="2"
      />

      {/* Four entry blocks — Dr column on left, Cr column on right */}
      <rect x="6" y="14.5" width="7" height="2.5" rx="1" fill={`url(#${gradId})`} opacity="0.95" />
      <rect x="6" y="19" width="7" height="2.5" rx="1" fill={`url(#${gradId})`} opacity="0.55" />
      <rect x="19" y="14.5" width="7" height="2.5" rx="1" fill={`url(#${gradId})`} opacity="0.55" />
      <rect x="19" y="19" width="7" height="2.5" rx="1" fill={`url(#${gradId})`} opacity="0.95" />
    </svg>
  )
}

// ─── Wordmark — Aurora "Superaccountant" ────────────────────

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('aurora-text font-semibold tracking-tight leading-none', className)}>
      Superaccountant
    </span>
  )
}

// ─── Combined Logo ──────────────────────────────────────────

type LogoProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  markOnly?: boolean
}

const SIZES = {
  sm: { mark: 26, text: 'text-sm' },
  md: { mark: 32, text: 'text-base' },
  lg: { mark: 44, text: 'text-xl' },
} as const

export function Logo({ className, size = 'sm', markOnly = false }: LogoProps) {
  const s = SIZES[size]
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Logomark size={s.mark} />
      {!markOnly && <Wordmark className={s.text} />}
    </span>
  )
}
