import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Brand system — logomark + wordmark + combined logo.
 *
 * Wordmark (matches the image):
 *   Super    → fg color (white on dark, black on light)
 *   a        → blue (#4aa9ff)
 *   ccountant → purple (#a78bfa)
 *
 * Logomark: bold "S" with the same blue→purple gradient, inside a
 * rounded-square tile. Scales cleanly from 16px favicon to 128px.
 */

const BLUE = '#4aa9ff'
const PURPLE = '#a78bfa'

// ─── Logomark ───────────────────────────────────────────────

type MarkProps = {
  size?: number
  className?: string
  /** 'tile' = black rounded-square bg with white S → gradient only letter.
   *  'solid' = no background, just the gradient S floating. */
  variant?: 'tile' | 'solid'
}

export function Logomark({ size = 28, className, variant = 'tile' }: MarkProps) {
  // Unique gradient id so multiple instances on the page don't collide.
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
        <linearGradient id={gradId} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={BLUE} />
          <stop offset="100%" stopColor={PURPLE} />
        </linearGradient>
      </defs>

      {variant === 'tile' && (
        <rect width="32" height="32" rx="8" className="fill-fg" />
      )}

      <text
        x="16"
        y="16"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-inter), Inter, system-ui, -apple-system, sans-serif"
        fontSize="22"
        fontWeight="800"
        letterSpacing="-0.04em"
        fill={variant === 'tile' ? `url(#${gradId})` : `url(#${gradId})`}
        style={{ paintOrder: 'stroke' }}
      >
        S
      </text>
    </svg>
  )
}

// ─── Wordmark ───────────────────────────────────────────────

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-semibold tracking-tight leading-none', className)}>
      <span className="text-fg">Super</span>
      <span style={{ color: BLUE }}>a</span>
      <span style={{ color: PURPLE }}>ccountant</span>
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

