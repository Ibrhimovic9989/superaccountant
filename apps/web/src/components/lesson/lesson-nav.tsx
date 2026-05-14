'use client'

import { cn } from '@/lib/utils'
import { BarChart3, Check, Eye, FileText, GitBranch, Network, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'

const ICONS = {
  watch: Eye,
  read: FileText,
  visualize: BarChart3,
  flow: GitBranch,
  map: Network,
  try: Sparkles,
} as const

const LABELS = {
  en: {
    watch: 'Watch',
    read: 'Read',
    visualize: 'Visualize',
    flow: 'Flow',
    map: 'Map',
    try: 'Practice',
  },
  ar: { watch: 'شاهد', read: 'اقرأ', visualize: 'تصوّر', flow: 'مخطط', map: 'خريطة', try: 'تمرّن' },
} as const

/** Per-section colour theme. Used by both this nav and the section headers
 *  so the visual identity stays consistent across the lesson. Hex values
 *  are kept inline so Tailwind's purge can't strip them. */
export const SECTION_COLORS: Record<Section, string> = {
  watch: '#38bdf8', // sky
  read: '#a78bfa', // violet (theme accent)
  visualize: '#10b981', // emerald
  flow: '#fbbf24', // amber
  map: '#22d3ee', // cyan
  try: '#f472b6', // pink
}

export type Section = 'watch' | 'read' | 'visualize' | 'flow' | 'map' | 'try'

type Props = {
  sections: Section[]
  locale: 'en' | 'ar'
}

/**
 * Checkpoint-style lesson nav. Visited sections fill in as the student
 * scrolls past them, the current one pulses, and a connector line runs
 * down the middle (desktop) / across (mobile).
 *
 * Active = section currently in viewport (IntersectionObserver).
 * Visited = section scrolled past (its top is above the viewport).
 */
export function LessonNav({ sections, locale }: Props) {
  const [active, setActive] = useState<Section>(sections[0] ?? 'read')
  const [visited, setVisited] = useState<Set<Section>>(new Set())

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Update visited set: any section whose top is above viewport counts as visited.
        setVisited((prev) => {
          let changed = false
          const next = new Set(prev)
          for (const e of entries) {
            const id = e.target.id as Section
            if (e.boundingClientRect.top < 0 && !next.has(id)) {
              next.add(id)
              changed = true
            }
          }
          return changed ? next : prev
        })
        // Active = top-most intersecting section.
        const intersecting = entries.filter((e) => e.isIntersecting)
        if (intersecting.length === 0) return
        const top = intersecting.sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
        )[0]
        if (top) {
          const id = top.target.id as Section
          setActive((prev) => (prev === id ? prev : id))
        }
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: 0 },
    )
    for (const s of sections) {
      const el = document.getElementById(s)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [sections])

  function jump(s: Section) {
    document.getElementById(s)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Progress ratio for the connector line (0..1).
  const reachedCount = sections.findIndex((s) => s === active)
  const visitedCount = sections.filter((s) => visited.has(s) || s === active).length
  const fill =
    sections.length > 1 ? Math.max(reachedCount, visitedCount - 1) / (sections.length - 1) : 1

  return (
    <nav
      className="md:sticky md:top-20 md:self-start"
      aria-label={locale === 'ar' ? 'تنقل الدرس' : 'Lesson navigation'}
    >
      {/* Desktop: vertical column with a fill-able connector line. */}
      <div className="relative hidden md:block">
        {/* Connector — base track */}
        <span className="absolute bottom-2 left-[15px] top-2 w-px bg-border" aria-hidden />
        {/* Connector — filled portion */}
        <motion.span
          aria-hidden
          className="absolute left-[15px] top-2 w-px bg-gradient-to-b from-accent via-accent/70 to-accent/30"
          initial={{ height: 0 }}
          animate={{ height: `calc(${Math.max(fill, 0.02) * 100}% - 16px)` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        <ul className="relative flex flex-col gap-3">
          {sections.map((s) => (
            <CheckpointNode
              key={s}
              section={s}
              label={LABELS[locale][s]}
              isActive={active === s}
              isVisited={visited.has(s) && active !== s}
              onClick={() => jump(s)}
            />
          ))}
        </ul>
      </div>

      {/* Mobile: horizontal pill row */}
      <ul className="flex gap-1.5 overflow-x-auto pb-2 md:hidden">
        {sections.map((s) => {
          const Icon = ICONS[s]
          const label = LABELS[locale][s]
          const isActive = active === s
          const isVisited = visited.has(s) && !isActive
          const color = SECTION_COLORS[s]
          return (
            <li key={s} className="shrink-0">
              <button
                type="button"
                onClick={() => jump(s)}
                className={cn(
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all',
                  isActive
                    ? 'border-transparent text-bg shadow-sm'
                    : isVisited
                      ? 'border-border/60 bg-bg-elev text-fg'
                      : 'border-border bg-bg-elev/40 text-fg-subtle',
                )}
                style={
                  isActive
                    ? {
                        background: color,
                        boxShadow: `0 0 0 1px ${color}40, 0 4px 12px -4px ${color}80`,
                      }
                    : undefined
                }
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function CheckpointNode({
  section,
  label,
  isActive,
  isVisited,
  onClick,
}: {
  section: Section
  label: string
  isActive: boolean
  isVisited: boolean
  onClick: () => void
}) {
  const Icon = ICONS[section]
  const color = SECTION_COLORS[section]
  const reached = isActive || isVisited
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="group relative flex w-full items-center gap-3 text-left"
        aria-current={isActive ? 'true' : undefined}
      >
        <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center">
          {/* Pulsing ring for the active checkpoint */}
          {isActive && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: `0 0 0 2px ${color}, 0 0 18px ${color}80` }}
              animate={{ opacity: [0.6, 1, 0.6], scale: [0.92, 1.06, 0.92] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            />
          )}
          <span
            className={cn(
              'relative inline-flex h-7 w-7 items-center justify-center rounded-full border-2 bg-bg transition-all',
              reached ? '' : 'border-border text-fg-subtle group-hover:border-border-strong',
            )}
            style={
              reached
                ? {
                    borderColor: color,
                    background: isVisited ? `${color}30` : 'var(--bg)',
                    color,
                  }
                : undefined
            }
          >
            {isVisited ? <Check className="h-3 w-3" /> : <Icon className="h-3.5 w-3.5" />}
          </span>
        </span>
        <span
          className={cn(
            'font-mono text-[11px] uppercase tracking-wider transition-colors',
            isActive
              ? 'text-fg'
              : isVisited
                ? 'text-fg-muted group-hover:text-fg'
                : 'text-fg-subtle group-hover:text-fg-muted',
          )}
        >
          {label}
        </span>
      </button>
    </li>
  )
}
