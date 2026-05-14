'use client'

import { STREAK_MILESTONES, type StreakMilestone } from '@/lib/data/xp'
import { cn } from '@/lib/utils'
import { Flame } from 'lucide-react'
import { motion } from 'motion/react'

// Per-rung colour theme. The ladder feels like a journey because each
// rung is its own shade — Spark starts warm, the colours cool through
// the middle, then heat back up at Legend.
const RUNG_COLORS = ['#38bdf8', '#a78bfa', '#22d3ee', '#10b981', '#fbbf24', '#f472b6'] as const

/**
 * Streak ladder — shows the milestone progression with the current
 * position highlighted. Each rung lights up as the student reaches it.
 *
 * The flame icon scales with streak intensity:
 *   <3 days  → small, muted
 *    3–6     → small accent flame
 *    7–13    → medium warm flame
 *    14–29   → strong orange flame
 *    30+     → blue flame (legendary tier)
 */
type Props = {
  days: number
  locale: 'en' | 'ar'
}

export function StreakLadder({ days, locale }: Props) {
  const next = STREAK_MILESTONES.find((m) => days < m.days) ?? null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <AnimatedFlame days={days} />
          <span className="font-mono text-4xl font-medium tracking-tight tabular-nums">{days}</span>
          <span className="font-mono text-sm text-fg-subtle">
            {locale === 'ar' ? 'يوم' : 'days'}
          </span>
        </div>
        {next && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {next.days - days} → {locale === 'ar' ? next.labelAr : next.labelEn}
          </span>
        )}
      </div>

      {/* Ladder rungs */}
      <div className="grid grid-cols-6 gap-1.5">
        {STREAK_MILESTONES.map((m, i) => {
          const reached = days >= m.days
          const isCurrent = next?.days === m.days
          const color = RUNG_COLORS[i] ?? '#a78bfa'
          return (
            <Rung
              key={m.days}
              milestone={m}
              color={color}
              reached={reached}
              isCurrent={isCurrent}
              locale={locale}
            />
          )
        })}
      </div>
    </div>
  )
}

function Rung({
  milestone,
  color,
  reached,
  isCurrent,
  locale,
}: {
  milestone: StreakMilestone
  color: string
  reached: boolean
  isCurrent: boolean
  locale: 'en' | 'ar'
}) {
  return (
    <div
      className={cn(
        'group relative flex flex-col items-center gap-1 rounded-md border px-1.5 py-2 transition-all',
        !reached && !isCurrent && 'border-border bg-bg-overlay/40 text-fg-subtle',
      )}
      style={
        reached || isCurrent
          ? {
              borderColor: `${color}66`,
              background: `${color}1A`,
              color,
            }
          : undefined
      }
    >
      {isCurrent && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-md"
          style={{ boxShadow: `inset 0 0 0 1px ${color}99` }}
          initial={{ opacity: 0.2 }}
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        />
      )}
      <span className="font-mono text-[10px] font-semibold tabular-nums">{milestone.days}d</span>
      <span className="font-mono text-[8px] uppercase tracking-wider leading-tight">
        {locale === 'ar' ? milestone.labelAr : milestone.labelEn}
      </span>
    </div>
  )
}

function AnimatedFlame({ days }: { days: number }) {
  // Scale + colour the flame by streak intensity. Pure CSS — no JS loop.
  const size = days >= 30 ? 'h-6 w-6' : days >= 14 ? 'h-5 w-5' : 'h-4 w-4'
  const color =
    days >= 30
      ? 'text-info'
      : days >= 7
        ? 'text-warning'
        : days >= 3
          ? 'text-accent'
          : 'text-fg-subtle'
  return (
    <motion.span
      aria-hidden
      animate={days > 0 ? { y: [0, -2, 0], scale: [1, 1.08, 1] } : {}}
      transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      className="inline-flex"
    >
      <Flame className={cn(size, color)} />
    </motion.span>
  )
}
