'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Eye, FileText, GitBranch, Network, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS = {
  watch: Eye,
  read: FileText,
  visualize: BarChart3,
  flow: GitBranch,
  map: Network,
  try: Sparkles,
} as const

const LABELS = {
  en: { watch: 'Watch', read: 'Read', visualize: 'Visualize', flow: 'Flow', map: 'Map', try: 'Practice' },
  ar: { watch: 'شاهد', read: 'اقرأ', visualize: 'تصوّر', flow: 'مخطط', map: 'خريطة', try: 'تمرّن' },
} as const

export type Section = 'watch' | 'read' | 'visualize' | 'flow' | 'map' | 'try'

type Props = {
  sections: Section[]
  locale: 'en' | 'ar'
}

/**
 * Sticky in-page nav rail. Highlights the section currently in view via
 * IntersectionObserver. Click → smooth scroll. Mobile: horizontal scroll bar.
 */
export function LessonNav({ sections, locale }: Props) {
  const [active, setActive] = useState<Section>(sections[0] ?? 'read')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
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
    sections.forEach((s) => {
      const el = document.getElementById(s)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  function jump(s: Section) {
    document.getElementById(s)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="md:sticky md:top-20 md:self-start">
      <ul className="flex gap-1 overflow-x-auto pb-2 md:flex-col md:gap-0.5 md:overflow-visible md:pb-0">
        {sections.map((s) => {
          const Icon = ICONS[s]
          const label = LABELS[locale][s]
          const isActive = active === s
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => jump(s)}
                className={cn(
                  'group relative flex w-full items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-left font-mono text-[11px] uppercase tracking-wider transition-colors',
                  isActive
                    ? 'bg-bg-overlay text-fg'
                    : 'text-fg-subtle hover:bg-bg-overlay hover:text-fg-muted',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-4 w-4 items-center justify-center transition-colors',
                    isActive ? 'text-accent' : 'text-fg-subtle group-hover:text-fg-muted',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span>{label}</span>
                {isActive && (
                  <span className="absolute inset-y-1 inset-inline-start-0 hidden w-0.5 rounded-r-full bg-accent md:block" />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
