'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { LessonContent } from './lesson-content'
import { MermaidBlock } from './mermaid-block'
import { Practice } from './practice'
import { LessonNav, type Section } from './lesson-nav'
import { OnboardingCoachmark } from './onboarding-coachmark'
import {
  TutorDrawer,
  type TutorContext,
  type TutorDrawerHandle,
} from '@/components/tutor/tutor-drawer'
import type { LessonView } from '@/lib/data/lessons'
import { PUBLIC_CONFIG } from '@/lib/config/public'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BlurFade } from '@/components/magicui/blur-fade'
import { cn } from '@/lib/utils'

const SECTIONS: Section[] = ['watch', 'read', 'flow', 'map', 'try']

const LABELS = {
  en: {
    watch: 'Watch',
    read: 'Read',
    flow: 'Flow',
    map: 'Map',
    try: 'Practice',
    prev: 'Previous',
    next: 'Next lesson',
    markComplete: 'Mark complete',
    completing: 'Saving…',
    completed: 'Completed',
    objectives: "What you'll learn",
  },
  ar: {
    watch: 'شاهد',
    read: 'اقرأ',
    flow: 'مخطط',
    map: 'خريطة',
    try: 'تمرّن',
    prev: 'السابق',
    next: 'الدرس التالي',
    markComplete: 'تم الإكمال',
    completing: 'جاري الحفظ…',
    completed: 'تم',
    objectives: 'ماذا ستتعلم',
  },
} as const

type Props = {
  lesson: LessonView
  locale: 'en' | 'ar'
  tutorContext: TutorContext
  userId: string
}

export function LessonShell({ lesson, locale, tutorContext, userId }: Props) {
  const tutorRef = useRef<TutorDrawerHandle | null>(null)
  const [mcqResult, setMcqResult] = useState({ correct: 0, total: 0 })
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState<{ mastery: number } | null>(null)
  const [videoError, setVideoError] = useState(false)

  const t = LABELS[locale]
  const title = locale === 'ar' ? lesson.titleAr : lesson.titleEn
  const markdown = locale === 'ar' ? lesson.contentArMdx : lesson.contentEnMdx

  const hasRealVideo = !!lesson.videoUrl && lesson.videoUrl.length > 0
  const localizedVideoUrl =
    hasRealVideo && lesson.videoUrl
      ? locale === 'ar'
        ? lesson.videoUrl.replace(/\/en\.mp4/, '/ar.mp4')
        : lesson.videoUrl
      : null

  const visible = useMemo(
    () =>
      SECTIONS.filter((s) => {
        if (s === 'flow') return !!lesson.flowchartMermaid
        if (s === 'map') return !!lesson.mindmapMermaid
        if (s === 'try') return lesson.assessmentItems.length > 0
        if (s === 'watch') return hasRealVideo
        return true
      }),
    [
      lesson.flowchartMermaid,
      lesson.mindmapMermaid,
      lesson.assessmentItems.length,
      hasRealVideo,
    ],
  )

  const askTutor = useCallback((text: string) => tutorRef.current?.ask(text), [])
  const handleMcqResult = useCallback((correct: number, total: number) => {
    setMcqResult((prev) =>
      prev.correct === correct && prev.total === total ? prev : { correct, total },
    )
  }, [])

  async function markComplete() {
    setCompleting(true)
    try {
      const res = await fetch(`${PUBLIC_CONFIG.apiUrl}/learning/mark-complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId,
          lessonSlug: lesson.slug,
          mcqCorrect: mcqResult.correct,
          mcqTotal: mcqResult.total,
        }),
      })
      if (!res.ok) throw new Error(`api ${res.status}`)
      const data = (await res.json()) as { mastery: number }
      setCompleted({ mastery: data.mastery })
    } catch (err) {
      console.error('mark complete failed', err)
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-x-10 gap-y-4 overflow-hidden px-4 py-8 sm:px-6 sm:py-12 md:grid-cols-[120px_minmax(0,1fr)] md:gap-y-0">
      {/* ── Mobile breadcrumb (shows on narrow screens before the rail) ── */}
      <div className="md:hidden">
        <Link
          href={`/${locale}/dashboard`}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-subtle transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-3 w-3 rtl:rotate-180" />
          {locale === 'ar' ? `المرحلة ${lesson.phase.order}` : `Phase ${lesson.phase.order}`}
          <span className="text-fg-subtle/50 mx-1">/</span>
          <span className="normal-case">
            {locale === 'ar' ? lesson.module.titleAr : lesson.module.titleEn}
          </span>
        </Link>
      </div>

      {/* ── Sticky rail (md+) — mobile gets a horizontal nav strip inside article ── */}
      <BlurFade delay={0.05} className="hidden md:block">
        <LessonNav sections={visible} locale={locale} />
      </BlurFade>

      {/* ── Body ──────────────────────────────────────────── */}
      <article className="min-w-0 overflow-hidden">
        {/* Mobile horizontal nav strip */}
        <div className="mb-6 md:hidden">
          <LessonNav sections={visible} locale={locale} />
        </div>

        {/* Title (desktop breadcrumb above; mobile breadcrumb sits at top of grid) */}
        <BlurFade delay={0.08}>
          <div className="mb-3 hidden items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-subtle md:flex">
            <Link
              href={`/${locale}/dashboard`}
              className="inline-flex items-center gap-1 transition-colors hover:text-fg"
            >
              <ArrowLeft className="h-3 w-3 rtl:rotate-180" />
              {locale === 'ar' ? `المرحلة ${lesson.phase.order}` : `Phase ${lesson.phase.order}`}
            </Link>
            <span className="text-fg-subtle/50">/</span>
            <span className="normal-case">
              {locale === 'ar' ? lesson.module.titleAr : lesson.module.titleEn}
            </span>
          </div>
          <h1 className="text-[1.625rem] font-semibold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl">
            {title}
          </h1>
        </BlurFade>

        {/* Objectives — vertical stack with bullets (locale-aware) */}
        {(() => {
          const objectives =
            locale === 'ar' && lesson.learningObjectivesAr.length > 0
              ? lesson.learningObjectivesAr
              : lesson.learningObjectives
          if (objectives.length === 0) return null
          return (
            <BlurFade delay={0.12}>
              <div className="mt-8 rounded-xl border border-border bg-bg-elev p-5">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  {t.objectives}
                </p>
                <ul className="space-y-2">
                  {objectives.map((o) => (
                    <li key={o} className="flex items-start gap-3 text-sm text-fg-muted">
                      <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-accent" />
                      <span className="leading-relaxed">{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </BlurFade>
          )
        })()}

        {/* ── Sections ───────────────────────────────────── */}
        <div className="mt-10 space-y-12 sm:mt-12 sm:space-y-16">
          {hasRealVideo && localizedVideoUrl && (
            <BlurFade delay={0.16}>
              <section id="watch" className="scroll-mt-24">
                <SectionHeader label={t.watch} />
                {videoError ? (
                  <div className="flex aspect-video items-center justify-center rounded-xl border border-border bg-bg-elev text-center">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                        {locale === 'ar' ? 'الفيديو غير متاح حالياً' : 'Video unavailable'}
                      </p>
                      <p className="mt-2 text-sm text-fg-muted">
                        {locale === 'ar'
                          ? 'يرجى الاطلاع على المحتوى المكتوب أدناه'
                          : 'Please refer to the written content below'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border bg-black">
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      src={localizedVideoUrl}
                      className="aspect-video w-full"
                      onError={() => setVideoError(true)}
                    >
                      <track kind="captions" />
                    </video>
                  </div>
                )}
              </section>
            </BlurFade>
          )}

          <BlurFade delay={0.2}>
            <section id="read" className="scroll-mt-24">
              <SectionHeader label={t.read} />
              <LessonContent markdown={markdown} />
            </section>
          </BlurFade>

          {lesson.flowchartMermaid && (
            <BlurFade delay={0.24}>
              <section id="flow" className="scroll-mt-24">
                <SectionHeader label={t.flow} />
                <MermaidBlock source={lesson.flowchartMermaid} id={`${lesson.id}-flow`} />
              </section>
            </BlurFade>
          )}

          {lesson.mindmapMermaid && (
            <BlurFade delay={0.28}>
              <section id="map" className="scroll-mt-24">
                <SectionHeader label={t.map} />
                <MermaidBlock source={lesson.mindmapMermaid} id={`${lesson.id}-map`} />
              </section>
            </BlurFade>
          )}

          {lesson.assessmentItems.length > 0 && (
            <BlurFade delay={0.32}>
              <section id="try" className="scroll-mt-24">
                <SectionHeader label={t.try} />
                <Practice
                  items={lesson.assessmentItems}
                  locale={locale}
                  onAskTutor={askTutor}
                  onMcqResult={handleMcqResult}
                />
              </section>
            </BlurFade>
          )}
        </div>

        {/* ── Footer nav ─────────────────────────────────── */}
        <BlurFade delay={0.36}>
          <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-8">
            {lesson.prevSlug ? (
              <Button asChild variant="ghost">
                <Link href={`/${locale}/lessons/${lesson.prevSlug}`}>
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                  {t.prev}
                </Link>
              </Button>
            ) : (
              <span />
            )}

            <div className="flex flex-wrap items-center gap-2">
              {completed ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
                  <Check className="h-3.5 w-3.5" />
                  {t.completed} · {Math.round(completed.mastery * 100)}%
                </span>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={markComplete}
                  disabled={completing}
                >
                  {completing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {t.completing}
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      {t.markComplete}
                    </>
                  )}
                </Button>
              )}
              {lesson.nextSlug && (
                <Button asChild variant="accent">
                  <Link href={`/${locale}/lessons/${lesson.nextSlug}`}>
                    {t.next}
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Link>
                </Button>
              )}
            </div>
          </footer>
        </BlurFade>
      </article>

      {/* ── Tutor drawer (sibling, fixed) ────────────────── */}
      <TutorDrawer
        context={tutorContext}
        defaultOpen={false}
        onRegister={(h) => {
          tutorRef.current = h
        }}
      />

      {/* ── First-visit onboarding (auto-dismisses, one time) ── */}
      <OnboardingCoachmark locale={locale} />
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="font-mono text-[11px] uppercase tracking-wider text-fg-muted">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
