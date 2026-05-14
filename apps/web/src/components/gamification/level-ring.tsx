'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import * as React from 'react'

/**
 * Circular progress ring with the level number at its centre. The ring
 * fills from 0 to `progress` (0..1) representing XP into the current
 * level. Uses an SVG with stroke-dashoffset for smooth animation.
 *
 * Visual: stacked rings — base track (dim) + accent fill that animates
 * in on mount. The level digit is rendered with a subtle gradient.
 */
type Props = {
  level: number
  progress: number // 0..1
  size?: number
  stroke?: number
  className?: string
}

export function LevelRing({ level, progress, size = 120, stroke = 8, className }: Props) {
  const safeProgress = Math.max(0, Math.min(1, progress))
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r

  // Spring-animated progress for a satisfying fill.
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 60, damping: 18, mass: 1 })
  const dashoffset = useTransform(spring, (v) => circumference * (1 - v))

  React.useEffect(() => {
    mv.set(safeProgress)
  }, [mv, safeProgress])

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
        className="absolute inset-0 -rotate-90"
      >
        <title>Level {level} progress</title>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-bg-overlay"
        />
        {/* Glowing accent fill */}
        <defs>
          <linearGradient id={`level-ring-grad-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <filter id={`level-ring-glow-${level}`}>
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#level-ring-grad-${level})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashoffset }}
          filter={`url(#level-ring-glow-${level})`}
        />
      </svg>
      <div className="relative flex flex-col items-center">
        <span className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">Level</span>
        <span className="bg-gradient-to-br from-accent via-fg to-accent bg-clip-text font-mono text-3xl font-semibold leading-none tracking-tight text-transparent">
          {level}
        </span>
      </div>
    </div>
  )
}
