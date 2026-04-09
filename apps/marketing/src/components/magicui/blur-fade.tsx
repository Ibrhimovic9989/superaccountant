'use client'

import * as React from 'react'
import { useRef } from 'react'
import { motion, useInView, useReducedMotion, type MotionProps } from 'motion/react'

interface BlurFadeProps extends Omit<MotionProps, 'children'> {
  children: React.ReactNode
  className?: string
  duration?: number
  delay?: number
  offset?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  /**
   * When true (default), the element only animates once it enters the viewport.
   * When false, it animates immediately on mount.
   *
   * Note: this default flipped from the magic-ui original. With 45 fades on a
   * single page firing at the same time, immediate animation killed FPS — and
   * the in-viewport version is the one that actually feels native.
   */
  inViewOnly?: boolean
  inViewMargin?: string
}

/**
 * GPU-cheap fade-in. Animates only opacity + transform (compositor-only),
 * no `filter: blur()` (paint-heavy, the original cause of marketing jank).
 *
 * Respects prefers-reduced-motion: when set, it just renders the final state
 * with no animation at all.
 */
export function BlurFade({
  children,
  className,
  duration = 0.45,
  delay = 0,
  offset = 8,
  direction = 'down',
  inViewOnly = true,
  inViewMargin = '-80px',
  ...props
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null)
  // biome-ignore lint/suspicious/noExplicitAny: motion's margin type is internal
  const isInViewportNow = useInView(ref, { once: true, margin: inViewMargin as any })
  const reduceMotion = useReducedMotion()
  const isVisible = reduceMotion ? true : !inViewOnly || isInViewportNow

  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y'
  const sign = direction === 'right' || direction === 'down' ? -1 : 1
  const fromOffset = sign * offset

  return (
    <motion.div
      ref={ref}
      initial={reduceMotion ? false : { opacity: 0, [axis]: fromOffset }}
      animate={
        isVisible ? { opacity: 1, [axis]: 0 } : { opacity: 0, [axis]: fromOffset }
      }
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration, delay: 0.04 + delay, ease: [0.16, 1, 0.3, 1] }
      }
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}
