'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import * as React from 'react'

/**
 * Segmented XP bar — fills smoothly to the given progress (0..1) on mount.
 * Renders a faint inner glow that pulses across the filled portion so it
 * never feels static.
 */
type Props = {
  progress: number
  className?: string
}

export function XpBar({ progress, className }: Props) {
  const safe = Math.max(0, Math.min(1, progress))
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 70, damping: 18 })
  const width = useTransform(spring, (v) => `${v * 100}%`)

  React.useEffect(() => {
    mv.set(safe)
  }, [mv, safe])

  return (
    <div
      className={`relative h-2 w-full overflow-hidden rounded-full bg-bg-overlay ${className ?? ''}`}
    >
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent via-accent/80 to-accent"
        style={{ width }}
      />
      {/* Sweeping highlight inside the fill */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
        animate={{ left: ['-33%', '133%'] }}
        transition={{
          duration: 3.5,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeInOut',
          repeatDelay: 1.5,
        }}
        style={{ display: safe > 0.02 ? 'block' : 'none' }}
      />
    </div>
  )
}
