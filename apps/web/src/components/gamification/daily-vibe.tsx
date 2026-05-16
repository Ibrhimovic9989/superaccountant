'use client'

import { motion } from 'motion/react'
import * as React from 'react'

/**
 * Big colourful 'vibe' banner that sits above the level hero. Its
 * whole job is to be the first thing the student sees and to feel
 * personal: an emoji that reflects their streak state, a hand-picked
 * cheerful line, and a soft gradient that shifts on hover.
 *
 * Layered animations:
 *   - The gradient slowly pans left-right (subtle, ambient).
 *   - The emoji bobs + scales gently.
 *   - Three floating "confetti" shapes drift in the background.
 */

type Mood = 'fire' | 'momentum' | 'newday' | 'restart' | 'champion'

function pickMood(args: { streakDays: number; level: number }): Mood {
  if (args.streakDays >= 30) return 'champion'
  if (args.streakDays >= 7) return 'fire'
  if (args.streakDays >= 1) return 'momentum'
  if (args.level >= 3) return 'restart'
  return 'newday'
}

const MOODS: Record<
  Mood,
  {
    emoji: string
    enLine: string
    arLine: string
    gradient: string
    glow: string
  }
> = {
  champion: {
    emoji: '👑',
    enLine: "You're on royal form. Don't let the crown slip.",
    arLine: 'أنت في قمة عطائك. لا تدع التاج يسقط.',
    gradient: 'linear-gradient(120deg, #fbbf24 0%, #f472b6 45%, #a78bfa 100%)',
    glow: 'rgba(251,191,36,0.45)',
  },
  fire: {
    emoji: '🔥',
    enLine: "You're on fire — keep the streak alive.",
    arLine: 'أنت متوهج — حافظ على السلسلة.',
    gradient: 'linear-gradient(120deg, #fb923c 0%, #f472b6 50%, #a78bfa 100%)',
    glow: 'rgba(251,146,60,0.45)',
  },
  momentum: {
    emoji: '⚡',
    enLine: 'Momentum building. One lesson today seals it.',
    arLine: 'الزخم يتصاعد. درس واحد اليوم يثبته.',
    gradient: 'linear-gradient(120deg, #38bdf8 0%, #a78bfa 50%, #f472b6 100%)',
    glow: 'rgba(56,189,248,0.45)',
  },
  restart: {
    emoji: '🌱',
    enLine: 'Fresh start. Begin a new streak today.',
    arLine: 'بداية جديدة. ابدأ سلسلة جديدة اليوم.',
    gradient: 'linear-gradient(120deg, #10b981 0%, #38bdf8 50%, #a78bfa 100%)',
    glow: 'rgba(16,185,129,0.45)',
  },
  newday: {
    emoji: '✨',
    enLine: 'A perfect day to learn something new.',
    arLine: 'يوم مثالي لتعلم شيء جديد.',
    gradient: 'linear-gradient(120deg, #a78bfa 0%, #38bdf8 50%, #10b981 100%)',
    glow: 'rgba(167,139,250,0.45)',
  },
}

type Props = {
  streakDays: number
  level: number
  rankTitle: string
  xp: number
  locale: 'en' | 'ar'
}

export function DailyVibe({ streakDays, level, rankTitle, xp, locale }: Props) {
  const mood = pickMood({ streakDays, level })
  const m = MOODS[mood]
  const line = locale === 'ar' ? m.arLine : m.enLine

  return (
    <div
      className="group relative isolate overflow-hidden rounded-3xl border-2 border-white/10 px-5 py-6 sm:px-7 sm:py-7"
      style={{
        background: m.gradient,
        backgroundSize: '200% 100%',
        boxShadow: `0 18px 50px -18px ${m.glow}, inset 0 0 0 1px rgba(255,255,255,0.18)`,
      }}
    >
      {/* Slow ambient gradient pan */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: m.gradient, backgroundSize: '200% 100%' }}
        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
        transition={{ duration: 18, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />

      {/* Floating soft confetti circles — pure decoration */}
      <FloatingShapes />

      <div className="relative flex items-center gap-4 sm:gap-6">
        {/* Bouncy emoji */}
        <motion.span
          aria-hidden
          className="text-5xl drop-shadow-lg sm:text-6xl"
          animate={{ y: [0, -6, 0], scale: [1, 1.08, 1], rotate: [-3, 3, -3] }}
          transition={{ duration: 3.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.25))' }}
        >
          {m.emoji}
        </motion.span>

        <div className="min-w-0 flex-1">
          <p
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/85 drop-shadow"
            style={{ textShadow: '0 1px 8px rgba(0,0,0,0.25)' }}
          >
            {locale === 'ar'
              ? `${rankTitle} · المستوى ${level} · ${xp} XP`
              : `${rankTitle} · Lvl ${level} · ${xp} XP`}
          </p>
          <p
            className="mt-1.5 text-xl font-semibold leading-tight tracking-tight text-white sm:text-2xl"
            style={{ textShadow: '0 2px 14px rgba(0,0,0,0.35)' }}
          >
            {line}
          </p>
        </div>

        {/* Streak counter pill — only shows if streak > 0 */}
        {streakDays > 0 && (
          <motion.div
            className="hidden shrink-0 items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur sm:inline-flex"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 14 }}
          >
            <span className="text-base" aria-hidden>
              🔥
            </span>
            <span className="font-mono text-sm font-semibold text-white tabular-nums">
              {streakDays}d
            </span>
          </motion.div>
        )}
      </div>
    </div>
  )
}

function FloatingShapes() {
  // Three soft circles drifting at different speeds — purely cosmetic.
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.span
        className="absolute -left-6 -top-4 h-20 w-20 rounded-full bg-white/15"
        animate={{ x: [0, 8, 0], y: [0, 6, 0] }}
        transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute right-12 -top-8 h-14 w-14 rounded-full bg-white/12"
        animate={{ x: [0, -10, 0], y: [0, 10, 0] }}
        transition={{ duration: 9, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay: 1 }}
      />
      <motion.span
        className="absolute -bottom-6 right-1/3 h-24 w-24 rounded-full bg-white/10"
        animate={{ x: [0, 12, 0], y: [0, -8, 0] }}
        transition={{ duration: 11, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay: 2 }}
      />
    </div>
  )
}
