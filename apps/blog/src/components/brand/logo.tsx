import { LOGO_URL } from '@/lib/brand'
import { cn } from '@/lib/utils'
import * as React from 'react'

/**
 * Brand system — logomark + wordmark. Mirrors apps/marketing's brand
 * component so a single PNG / colour swap propagates across all four
 * Next.js apps (web / marketing / companies / blog).
 */

type MarkProps = {
  size?: number
  className?: string
}

export function Logomark({ size = 28, className }: MarkProps) {
  // Plain <img> rather than next/image — swapping the asset is a one-
  // line constant change with no domain-allowlist config required.
  return (
    // biome-ignore lint/performance/noImgElement: see comment above
    <img
      src={LOGO_URL}
      width={size}
      height={size}
      alt="Superaccountant"
      className={cn('shrink-0 object-contain', className)}
      loading="eager"
      decoding="async"
    />
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('aurora-text font-semibold tracking-tight leading-none', className)}>
      Superaccountant
    </span>
  )
}
