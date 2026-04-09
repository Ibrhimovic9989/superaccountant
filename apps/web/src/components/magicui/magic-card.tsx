'use client'

import * as React from 'react'
import { motion, useMotionTemplate, useMotionValue } from 'motion/react'
import { cn } from '@/lib/utils'

interface MagicCardProps {
  children?: React.ReactNode
  className?: string
  gradientSize?: number
  gradientColor?: string
  gradientOpacity?: number
  gradientFrom?: string
  gradientTo?: string
}

/**
 * Spotlight card. Mouse-following gradient highlights the borders on hover.
 * Adapted from Magic UI to use SuperAccountant CSS vars (--bg-elev, --border)
 * and dropped the next-themes orb mode for simplicity.
 */
export function MagicCard({
  children,
  className,
  gradientSize = 220,
  gradientColor = 'rgba(139, 92, 246, 0.18)',
  gradientOpacity = 0.85,
  gradientFrom = '#8b5cf6',
  gradientTo = '#a78bfa',
}: MagicCardProps) {
  const mouseX = useMotionValue(-gradientSize)
  const mouseY = useMotionValue(-gradientSize)

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  function handlePointerLeave() {
    mouseX.set(-gradientSize)
    mouseY.set(-gradientSize)
  }

  return (
    <motion.div
      className={cn(
        'group relative isolate overflow-hidden rounded-[inherit] border border-transparent',
        className,
      )}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        background: useMotionTemplate`
          linear-gradient(var(--bg-elev) 0 0) padding-box,
          radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
            ${gradientFrom},
            ${gradientTo},
            var(--border) 100%
          ) border-box
        `,
      }}
    >
      <div
        className="absolute inset-px z-20 rounded-[inherit]"
        style={{ background: 'var(--bg-elev)' }}
      />
      <motion.div
        suppressHydrationWarning
        className="pointer-events-none absolute inset-px z-30 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
              ${gradientColor},
              transparent 100%
            )
          `,
          opacity: gradientOpacity,
        }}
      />
      <div className="relative z-40">{children}</div>
    </motion.div>
  )
}
