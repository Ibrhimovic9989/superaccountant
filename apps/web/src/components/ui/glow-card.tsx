'use client'

import { cn } from '@/lib/utils'
import * as React from 'react'

/**
 * Thin, futuristic card with a cursor-follow glow that tracks the
 * mouse position via CSS variables. No motion lib needed — pointermove
 * sets `--mx` / `--my` on the element, and a `::before` pseudo-element
 * paints a soft radial gradient at that point.
 *
 * Use anywhere a card should feel "interactive" without being garish.
 * Sharp 1px borders, restrained accent tint on the trail.
 */

type Props = React.HTMLAttributes<HTMLDivElement> & {
  /** Accent colour for the cursor glow. Defaults to violet. */
  glowColor?: string
  /** Glow radius in px. Defaults to 240. */
  glowSize?: number
}

export const GlowCard = React.forwardRef<HTMLDivElement, Props>(function GlowCard(
  { className, glowColor = '#a78bfa', glowSize = 240, style, children, ...rest },
  ref,
) {
  const handleMove = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const t = e.currentTarget
    const r = t.getBoundingClientRect()
    t.style.setProperty('--mx', `${e.clientX - r.left}px`)
    t.style.setProperty('--my', `${e.clientY - r.top}px`)
  }, [])

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      className={cn(
        'group relative isolate overflow-hidden rounded-xl border border-border bg-bg-elev/60 backdrop-blur-md transition-colors duration-300 hover:border-border-strong',
        // The pseudo-element below carries the glow. inset-0 + pointer-
        // events-none keeps it from interfering with child interactions.
        'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-300 before:content-[""] group-hover:before:opacity-100 hover:before:opacity-100',
        className,
      )}
      style={
        {
          ...style,
          '--glow-color': glowColor,
          '--glow-size': `${glowSize}px`,
        } as React.CSSProperties
      }
      {...rest}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(var(--glow-size) circle at var(--mx, 50%) var(--my, 50%), color-mix(in oklab, var(--glow-color) 22%, transparent), transparent 70%)',
        }}
      />
      {children}
    </div>
  )
})
