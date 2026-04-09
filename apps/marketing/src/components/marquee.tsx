import * as React from 'react'
import { cn } from '@/lib/utils'

type Props = {
  items: readonly React.ReactNode[]
  className?: string
  duration?: number
}

/**
 * Infinite horizontal marquee. Renders the items twice and slides 100%.
 * Uses CSS animation defined in globals.css.
 */
export function Marquee({ items, className, duration = 40 }: Props) {
  return (
    <div
      className={cn('group relative flex overflow-hidden', className)}
      style={{
        maskImage:
          'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
      }}
    >
      <div
        className="flex shrink-0 items-center gap-4 pe-4 animate-marquee"
        style={{ ['--duration' as string]: `${duration}s`, ['--gap' as string]: '1rem' }}
      >
        {items.map((item, i) => (
          <React.Fragment key={i}>{item}</React.Fragment>
        ))}
      </div>
      <div
        aria-hidden
        className="flex shrink-0 items-center gap-4 pe-4 animate-marquee"
        style={{ ['--duration' as string]: `${duration}s`, ['--gap' as string]: '1rem' }}
      >
        {items.map((item, i) => (
          <React.Fragment key={`d-${i}`}>{item}</React.Fragment>
        ))}
      </div>
    </div>
  )
}
