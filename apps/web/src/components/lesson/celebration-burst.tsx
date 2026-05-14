'use client'

import { motion } from 'motion/react'
import * as React from 'react'

/**
 * Burst of coloured dots radiating outward from the centre — a tasteful
 * celebration when a lesson is completed or a milestone is hit. No
 * emoji confetti, no sound, no kid-coded chaos: just a quick 600ms
 * radial sparkle that respects the surrounding theme.
 *
 * Render conditionally (e.g. {showBurst && <CelebrationBurst />}). Mount
 * fires the animation; unmount cleans it up.
 */

const COLOURS = ['#a78bfa', '#10b981', '#fbbf24', '#38bdf8', '#f472b6', '#f97316']

type Particle = {
  id: number
  angle: number
  distance: number
  size: number
  color: string
  delay: number
}

type Props = {
  count?: number
  durationMs?: number
  spread?: number
  className?: string
}

export function CelebrationBurst({ count = 18, durationMs = 700, spread = 120, className }: Props) {
  const particles = React.useMemo<Particle[]>(() => {
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
      const distance = spread * (0.6 + Math.random() * 0.6)
      const size = 4 + Math.floor(Math.random() * 5)
      const color = COLOURS[i % COLOURS.length] ?? COLOURS[0] ?? '#a78bfa'
      const delay = Math.random() * 60
      return { id: i, angle, distance, size, color, delay }
    })
  }, [count, spread])

  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-0 flex items-center justify-center ${className ?? ''}`}
    >
      <span className="relative h-0 w-0">
        {particles.map((p) => {
          const x = Math.cos(p.angle) * p.distance
          const y = Math.sin(p.angle) * p.distance
          return (
            <motion.span
              key={p.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.3 }}
              animate={{ x, y, opacity: 0, scale: 1 }}
              transition={{
                duration: durationMs / 1000,
                delay: p.delay / 1000,
                ease: [0.22, 0.61, 0.36, 1],
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: p.size,
                height: p.size,
                background: p.color,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
              }}
            />
          )
        })}
      </span>
    </span>
  )
}
