import { LOGO_URL } from '@/lib/brand'
import { cn } from '@/lib/utils'
import * as React from 'react'

/**
 * Brand system — logomark + wordmark + combined logo.
 *
 * Logomark renders the official PNG hosted on Supabase Storage
 * (LOGO_URL in lib/brand.ts). We use a plain <img> rather than
 * next/image so swapping the asset is a one-line constant change with
 * no domain-allowlist config required.
 *
 * Wordmark renders 'Superaccountant' with the aurora gradient.
 */

type MarkProps = {
  size?: number
  className?: string
}

export function Logomark({ size = 28, className }: MarkProps) {
  return (
    <img
      src={LOGO_URL}
      width={size}
      height={size}
      alt="Superaccountant"
      className={cn('shrink-0 object-contain', className)}
      // The logo is decorative when paired with the Wordmark; the
      // alt text only matters when Logomark renders alone.
      loading="eager"
      decoding="async"
    />
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
  sm: { mark: 36, text: 'text-base' },
  md: { mark: 44, text: 'text-lg' },
  lg: { mark: 56, text: 'text-2xl' },
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
