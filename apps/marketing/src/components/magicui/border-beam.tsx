'use client'

import * as React from 'react'
import {
  motion,
  useInView,
  useReducedMotion,
  type MotionStyle,
  type Transition,
} from 'motion/react'
import { cn } from '@/lib/utils'

interface BorderBeamProps {
  size?: number
  duration?: number
  delay?: number
  colorFrom?: string
  colorTo?: string
  transition?: Transition
  className?: string
  style?: React.CSSProperties
  reverse?: boolean
  initialOffset?: number
  borderWidth?: number
}

/**
 * Beam of light that travels around the perimeter of its container.
 * Use as an absolutely-positioned child of a relative-positioned wrapper.
 */
export function BorderBeam({
  className,
  size = 60,
  delay = 0,
  duration = 6,
  colorFrom = '#a78bfa',
  colorTo = '#8b5cf6',
  transition,
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 1.5,
}: BorderBeamProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  // biome-ignore lint/suspicious/noExplicitAny: motion margin type is internal
  const isVisible = useInView(containerRef, { margin: '200px' as any })
  const reduceMotion = useReducedMotion()

  // When the user prefers reduced motion, render a tiny static beam segment
  // instead of looping. When the element is offscreen, freeze the animation
  // so it doesn't burn frames the user can't see.
  const shouldAnimate = !reduceMotion && isVisible

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
      style={{
        padding: borderWidth,
        WebkitMask:
          'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
      }}
    >
      <motion.div
        className={cn('absolute aspect-square', className)}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            background: `linear-gradient(to left, ${colorFrom}, ${colorTo}, transparent)`,
            ...style,
          } as MotionStyle
        }
        initial={{ offsetDistance: `${initialOffset}%` }}
        animate={
          shouldAnimate
            ? {
                offsetDistance: reverse
                  ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
                  : [`${initialOffset}%`, `${100 + initialOffset}%`],
              }
            : { offsetDistance: `${initialOffset}%` }
        }
        transition={
          shouldAnimate
            ? {
                repeat: Number.POSITIVE_INFINITY,
                ease: 'linear',
                duration,
                delay: -delay,
                ...transition,
              }
            : { duration: 0 }
        }
      />
    </div>
  )
}
