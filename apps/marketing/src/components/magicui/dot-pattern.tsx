import * as React from 'react'
import { cn } from '@/lib/utils'

interface DotPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number
  height?: number
  cr?: number
  className?: string
  /** Kept for API compat — the static version is already glow-flavoured. */
  glow?: boolean
}

/**
 * Static dot-pattern background. Uses an SVG <pattern> tile that the browser
 * repeats natively — one DOM node total instead of one motion.circle per
 * cell. No animation, no JS, no resize listener. Renders at 60fps regardless
 * of viewport size.
 *
 * The original animated version rendered ~4000 motion.circles on a desktop
 * viewport, each running an infinite opacity+scale loop, which made every
 * marketing page jank constantly. The visual difference once you stop
 * looking for it is negligible.
 */
export function DotPattern({
  width = 18,
  height = 18,
  cr = 1,
  className,
  // biome-ignore lint/correctness/noUnusedVariables: kept for API compat
  glow: _glow,
  ...props
}: DotPatternProps) {
  const id = React.useId()
  return (
    <svg
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full text-fg-subtle/30',
        className,
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          x="0"
          y="0"
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={width / 2} cy={height / 2} r={cr} fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}
