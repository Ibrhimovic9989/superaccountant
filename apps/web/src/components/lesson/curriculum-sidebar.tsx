'use client'

import { cn } from '@/lib/utils'
import type { CurriculumTree, SidebarLesson } from '@/lib/data/curriculum-tree'
import { Check, ChevronDown, ChevronRight, CircleDot } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type Props = {
  tree: CurriculumTree
  currentLessonSlug: string
  locale: 'en' | 'ar'
}

const LABELS = {
  en: {
    track: 'Curriculum',
    phase: 'Phase',
    completeCount: (done: number, total: number) => `${done}/${total} lessons done`,
  },
  ar: {
    track: 'المنهج',
    phase: 'المرحلة',
    completeCount: (done: number, total: number) => `${done}/${total} درس مكتمل`,
  },
} as const

export function CurriculumSidebar({ tree, currentLessonSlug, locale }: Props) {
  const trackTitle = locale === 'ar' ? tree.trackTitleAr : tree.trackTitleEn
  const t = LABELS[locale]

  // Find which phase the current lesson lives in so we can auto-expand
  // it on mount. Other phases collapse by default — a long curriculum
  // (10+ phases) would otherwise turn the sidebar into a scroll-fest.
  const currentPhaseId = (() => {
    for (const phase of tree.phases) {
      for (const mod of phase.modules) {
        if (mod.lessons.some((l) => l.slug === currentLessonSlug)) return phase.id
      }
    }
    return tree.phases[0]?.id ?? null
  })()
  const [open, setOpen] = useState<Set<string>>(() => new Set(currentPhaseId ? [currentPhaseId] : []))

  // Scroll the active lesson into view once on mount. SSR can't do
  // this; without it the user lands at the top of the sidebar and has
  // to scroll-hunt for their place.
  useEffect(() => {
    const el = document.querySelector<HTMLAnchorElement>(`[data-lesson-slug="${currentLessonSlug}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })
  }, [currentLessonSlug])

  function togglePhase(id: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <nav
      aria-label={t.track}
      className="h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-border bg-bg-elev/40 p-2 backdrop-blur-md"
    >
      <div className="px-3 pb-2 pt-2">
        <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{t.track}</p>
        <p className="mt-1 text-sm font-medium text-fg">{trackTitle}</p>
      </div>

      <div className="flex flex-col gap-0.5">
        {tree.phases.map((phase) => {
          const phaseTitle = locale === 'ar' ? phase.titleAr : phase.titleEn
          const totals = phase.modules.flatMap((m) => m.lessons)
          const done = totals.filter((l) => l.completed).length
          const isOpen = open.has(phase.id)
          return (
            <div key={phase.id}>
              <button
                type="button"
                onClick={() => togglePhase(phase.id)}
                aria-expanded={isOpen}
                className={cn(
                  'group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                  'hover:bg-bg-overlay',
                )}
              >
                <span className="text-fg-muted group-hover:text-fg">
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </span>
                <span className="flex-1 truncate text-sm font-medium text-fg">{phaseTitle}</span>
                <span className="font-mono text-[10px] tabular-nums text-fg-subtle">
                  {t.completeCount(done, totals.length)}
                </span>
              </button>

              {isOpen && (
                <div className="ms-3 mt-0.5 border-s border-border ps-2">
                  {phase.modules.map((mod) => {
                    const modTitle = locale === 'ar' ? mod.titleAr : mod.titleEn
                    return (
                      <div key={mod.id} className="py-1">
                        <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                          {modTitle}
                        </p>
                        <ul className="flex flex-col">
                          {mod.lessons.map((lesson) => (
                            <SidebarRow
                              key={lesson.id}
                              lesson={lesson}
                              locale={locale}
                              active={lesson.slug === currentLessonSlug}
                            />
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}

function SidebarRow({
  lesson,
  locale,
  active,
}: {
  lesson: SidebarLesson
  locale: 'en' | 'ar'
  active: boolean
}) {
  const title = locale === 'ar' ? lesson.titleAr : lesson.titleEn
  return (
    <li>
      <Link
        href={`/${locale}/lessons/${lesson.slug}`}
        data-lesson-slug={lesson.slug}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          active
            ? 'bg-accent-soft text-accent'
            : 'text-fg-muted hover:bg-bg-overlay hover:text-fg',
        )}
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {lesson.completed ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : active ? (
            <CircleDot className="h-3.5 w-3.5 text-accent" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-border-strong" />
          )}
        </span>
        <span className="line-clamp-2 flex-1 leading-snug">{title}</span>
      </Link>
    </li>
  )
}
