'use client'

import { cn } from '@/lib/utils'
import type { CurriculumTree, SidebarLesson, SidebarPhase } from '@/lib/data/curriculum-tree'
import { Check, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Props = {
  tree: CurriculumTree
  currentLessonSlug: string
  locale: 'en' | 'ar'
}

const LABELS = {
  en: {
    track: 'Curriculum',
    overall: 'Overall progress',
    lessonsDone: (n: number, total: number) => `${n} of ${total}`,
  },
  ar: {
    track: 'المنهج',
    overall: 'التقدّم الكلي',
    lessonsDone: (n: number, total: number) => `${n} من ${total}`,
  },
} as const

export function CurriculumSidebar({ tree, currentLessonSlug, locale }: Props) {
  const t = LABELS[locale]
  const trackTitle = locale === 'ar' ? tree.trackTitleAr : tree.trackTitleEn

  // Pre-compute progress + the "which phase contains the current
  // lesson" pointer so each render doesn't walk the tree twice.
  const { totalLessons, doneLessons, currentPhaseId } = useMemo(() => {
    let total = 0
    let done = 0
    let current: string | null = null
    for (const phase of tree.phases) {
      for (const mod of phase.modules) {
        for (const lesson of mod.lessons) {
          total++
          if (lesson.completed) done++
          if (lesson.slug === currentLessonSlug) current = phase.id
        }
      }
    }
    return {
      totalLessons: total,
      doneLessons: done,
      currentPhaseId: current ?? tree.phases[0]?.id ?? null,
    }
  }, [tree, currentLessonSlug])

  const [open, setOpen] = useState<Set<string>>(
    () => new Set(currentPhaseId ? [currentPhaseId] : []),
  )

  // Scroll the active lesson into view on first paint so the user
  // lands where they are, not at the top of a long track.
  useEffect(() => {
    const el = document.querySelector<HTMLAnchorElement>(
      `[data-lesson-slug="${currentLessonSlug}"]`,
    )
    el?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })
  }, [currentLessonSlug])

  function togglePhase(id: string): void {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const overallPct = totalLessons === 0 ? 0 : Math.round((doneLessons / totalLessons) * 100)

  return (
    <nav
      aria-label={t.track}
      className="flex h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-2xl border border-border bg-bg-elev/60 backdrop-blur-md"
    >
      {/* Sticky track header — stays visible while phase list scrolls */}
      <header className="border-b border-border bg-bg-elev/80 px-4 pb-3 pt-4 backdrop-blur">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
          {t.track}
        </p>
        <p className="mt-1 text-sm font-semibold leading-tight text-fg">{trackTitle}</p>

        <div className="mt-3 flex items-center gap-3">
          <ProgressRing percent={overallPct} />
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] text-fg-subtle">{t.overall}</span>
            <span className="font-mono text-sm tabular-nums text-fg">
              {t.lessonsDone(doneLessons, totalLessons)}
            </span>
          </div>
        </div>
      </header>

      {/* Scrollable phase + module + lesson tree */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {tree.phases.map((phase, i) => (
          <PhaseBlock
            key={phase.id}
            phase={phase}
            locale={locale}
            isOpen={open.has(phase.id)}
            isCurrent={phase.id === currentPhaseId}
            currentLessonSlug={currentLessonSlug}
            onToggle={() => togglePhase(phase.id)}
            isLast={i === tree.phases.length - 1}
          />
        ))}
      </div>
    </nav>
  )
}

// ──────────────────────────────────────────────────────────────
// Phase row + collapsible module/lesson list
// ──────────────────────────────────────────────────────────────

type PhaseBlockProps = {
  phase: SidebarPhase
  locale: 'en' | 'ar'
  isOpen: boolean
  isCurrent: boolean
  currentLessonSlug: string
  onToggle: () => void
  isLast: boolean
}

function PhaseBlock({
  phase,
  locale,
  isOpen,
  isCurrent,
  currentLessonSlug,
  onToggle,
  isLast,
}: PhaseBlockProps) {
  const title = locale === 'ar' ? phase.titleAr : phase.titleEn
  const lessons = phase.modules.flatMap((m) => m.lessons)
  const done = lessons.filter((l) => l.completed).length
  const total = lessons.length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <div className={cn(!isLast && 'border-b border-border/60')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          'group flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left transition-colors',
          isCurrent ? 'bg-accent-soft/40' : 'hover:bg-bg-overlay',
        )}
      >
        <span
          className={cn(
            'inline-flex h-5 w-5 shrink-0 items-center justify-center text-fg-muted transition-transform',
            isOpen && 'rotate-90',
            isCurrent && 'text-accent',
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </span>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'truncate text-[13px] font-semibold leading-tight',
              isCurrent ? 'text-accent' : 'text-fg',
            )}
          >
            {title}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-border/70">
              <div
                className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-success' : 'bg-accent')}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-[10px] tabular-nums text-fg-subtle">
              {done}/{total}
            </span>
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="ms-3 pb-2 ps-2">
              {phase.modules.map((mod, mi) => (
                <ModuleBlock
                  key={mod.id}
                  title={locale === 'ar' ? mod.titleAr : mod.titleEn}
                  number={mi + 1}
                  lessons={mod.lessons}
                  locale={locale}
                  currentLessonSlug={currentLessonSlug}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Module heading + its lesson list (timeline style)
// ──────────────────────────────────────────────────────────────

type ModuleBlockProps = {
  title: string
  number: number
  lessons: SidebarLesson[]
  locale: 'en' | 'ar'
  currentLessonSlug: string
}

function ModuleBlock({ title, number, lessons, locale, currentLessonSlug }: ModuleBlockProps) {
  return (
    <div className="mt-2 first:mt-0">
      <div className="flex items-center gap-1.5 px-2 pb-1 pt-1.5">
        <span className="font-mono text-[10px] tabular-nums text-fg-subtle">
          {String(number).padStart(2, '0')}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-fg-muted">
          {title}
        </span>
      </div>
      {/* Timeline rail with a vertical line behind the status dots */}
      <ul className="relative">
        <span
          aria-hidden
          className="absolute inset-y-1 start-[15px] w-px bg-border/70"
        />
        {lessons.map((lesson, li) => (
          <SidebarRow
            key={lesson.id}
            lesson={lesson}
            order={li + 1}
            locale={locale}
            active={lesson.slug === currentLessonSlug}
          />
        ))}
      </ul>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Lesson row
// ──────────────────────────────────────────────────────────────

function SidebarRow({
  lesson,
  order,
  locale,
  active,
}: {
  lesson: SidebarLesson
  order: number
  locale: 'en' | 'ar'
  active: boolean
}) {
  const title = locale === 'ar' ? lesson.titleAr : lesson.titleEn
  const status: 'done' | 'in-progress' | 'active' | 'idle' = lesson.completed
    ? 'done'
    : active
      ? 'active'
      : lesson.mastery > 0
        ? 'in-progress'
        : 'idle'

  return (
    <li className="relative">
      <Link
        href={`/${locale}/lessons/${lesson.slug}`}
        data-lesson-slug={lesson.slug}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group relative flex items-center gap-2.5 rounded-md py-1.5 ps-1.5 pe-2 text-[13px] transition-colors',
          active
            ? 'bg-accent-soft text-accent'
            : 'text-fg-muted hover:bg-bg-overlay hover:text-fg',
        )}
      >
        {/* Active accent bar — only renders for the current lesson */}
        {active && (
          <span
            aria-hidden
            className="absolute inset-y-1 start-0 w-0.5 rounded-full bg-accent"
          />
        )}

        <StatusDot status={status} />

        <span className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className={cn(
              'font-mono text-[10px] tabular-nums',
              active ? 'text-accent/70' : 'text-fg-subtle',
            )}
          >
            {String(order).padStart(2, '0')}
          </span>
          <span className="line-clamp-2 flex-1 leading-snug">{title}</span>
        </span>
      </Link>
    </li>
  )
}

// ──────────────────────────────────────────────────────────────
// Status dot — 4 states with distinct visual treatment
// ──────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: 'done' | 'in-progress' | 'active' | 'idle' }) {
  if (status === 'done') {
    return (
      <span className="relative z-10 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success text-bg shadow-[0_0_0_3px_var(--bg)]">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    )
  }
  if (status === 'active') {
    return (
      <span className="relative z-10 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent shadow-[0_0_0_3px_var(--bg)]">
        <span className="h-1.5 w-1.5 rounded-full bg-accent-fg" />
      </span>
    )
  }
  if (status === 'in-progress') {
    return (
      <span className="relative z-10 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-bg-elev shadow-[0_0_0_3px_var(--bg)]">
        <span className="h-1 w-1 rounded-full bg-accent" />
      </span>
    )
  }
  return (
    <span className="relative z-10 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border-strong bg-bg-elev shadow-[0_0_0_3px_var(--bg)]" />
  )
}

// ──────────────────────────────────────────────────────────────
// Compact progress ring for the header
// ──────────────────────────────────────────────────────────────

function ProgressRing({ percent }: { percent: number }) {
  const radius = 14
  const circumference = 2 * Math.PI * radius
  const dash = circumference * (percent / 100)
  return (
    <div className="relative h-9 w-9 shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden>
        <title>progress</title>
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={percent === 100 ? 'var(--success)' : 'var(--accent)'}
          strokeWidth="3"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          className="transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-semibold tabular-nums text-fg">
        {percent}
      </span>
    </div>
  )
}
