'use client'

import { BlurFade } from '@/components/magicui/blur-fade'
import {
  type TutorContext,
  TutorDrawer,
  type TutorDrawerHandle,
} from '@/components/tutor/tutor-drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PUBLIC_CONFIG } from '@/lib/config/public'
import type { LessonView } from '@/lib/data/lessons'
import { pickScenario } from '@/lib/data/visualizer-scenarios'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight, Check, Loader2, Zap } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AccountingVisualizer } from './accounting-visualizer'
import { CelebrationBurst } from './celebration-burst'
import { LessonAudioPlayer } from './lesson-audio-player'
import { LessonContent } from './lesson-content'
import { LessonNav, SECTION_COLORS, type Section } from './lesson-nav'
import { MermaidBlock } from './mermaid-block'
import { OnboardingCoachmark } from './onboarding-coachmark'
import { Practice } from './practice'

const SECTIONS: Section[] = ['watch', 'read', 'visualize', 'flow', 'map', 'try']

const LABELS = {
  en: {
    watch: 'Watch',
    read: 'Read',
    visualize: 'Visualize',
    flow: 'Flow',
    map: 'Map',
    try: 'Practice',
    prev: 'Previous',
    next: 'Next lesson',
    markComplete: 'Complete lesson',
    completing: 'Saving…',
    completed: 'Lesson complete',
    objectives: "What you'll learn",
    masteryReached: 'Mastery',
    xpEarned: 'XP earned',
  },
  ar: {
    watch: 'شاهد',
    read: 'اقرأ',
    visualize: 'تصوّر',
    flow: 'مخطط',
    map: 'خريطة',
    try: 'تمرّن',
    prev: 'السابق',
    next: 'الدرس التالي',
    markComplete: 'إكمال الدرس',
    completing: 'جاري الحفظ…',
    completed: 'الدرس مكتمل',
    objectives: 'ماذا ستتعلم',
    masteryReached: 'الإتقان',
    xpEarned: 'النقاط',
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

  // Visible XP reward — matches the dashboard formula (100 base + small
  // bonus for nailing the MCQs). Display-only; the real source of truth
  // for dashboard XP is completedLessons + hours.
  const mcqBonus = mcqResult.total > 0 ? Math.round((mcqResult.correct / mcqResult.total) * 50) : 0
  const xpAward = 100 + mcqBonus

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
    [lesson.flowchartMermaid, lesson.mindmapMermaid, lesson.assessmentItems.length, hasRealVideo],
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
    <>
      <LessonTopBar
        title={title}
        xpAward={xpAward}
        sectionsCount={visible.length}
        locale={locale}
      />
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
                  <SectionHeader label={t.watch} section="watch" />
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
                <SectionHeader label={t.read} section="read" />
                {(() => {
                  const audioUrl = locale === 'ar' ? lesson.audioUrlAr : lesson.audioUrlEn
                  if (!audioUrl) return null
                  return (
                    <div className="mb-6">
                      <LessonAudioPlayer audioUrl={audioUrl} locale={locale} />
                    </div>
                  )
                })()}
                <LessonContent markdown={markdown} />
              </section>
            </BlurFade>

            <BlurFade delay={0.22}>
              <section id="visualize" className="scroll-mt-24">
                <SectionHeader label={t.visualize} section="visualize" />
                {(() => {
                  const scenario = pickScenario(lesson.slug)
                  return (
                    <AccountingVisualizer
                      locale={locale}
                      transactions={scenario.transactions}
                      title={locale === 'ar' ? scenario.titleAr : scenario.title}
                    />
                  )
                })()}
              </section>
            </BlurFade>

            {lesson.flowchartMermaid && (
              <BlurFade delay={0.24}>
                <section id="flow" className="scroll-mt-24">
                  <SectionHeader label={t.flow} section="flow" />
                  <MermaidBlock source={lesson.flowchartMermaid} id={`${lesson.id}-flow`} />
                </section>
              </BlurFade>
            )}

            {lesson.mindmapMermaid && (
              <BlurFade delay={0.28}>
                <section id="map" className="scroll-mt-24">
                  <SectionHeader label={t.map} section="map" />
                  <MermaidBlock source={lesson.mindmapMermaid} id={`${lesson.id}-map`} />
                </section>
              </BlurFade>
            )}

            {lesson.assessmentItems.length > 0 && (
              <BlurFade delay={0.32}>
                <section id="try" className="scroll-mt-24">
                  <SectionHeader label={t.try} section="try" />
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
                <AnimatePresence mode="wait" initial={false}>
                  {completed ? (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="relative inline-flex items-center gap-2 rounded-lg border border-success/40 bg-gradient-to-br from-success/15 via-success/5 to-bg-elev px-3 py-2 text-xs font-medium text-success shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_8px_24px_-12px_rgba(16,185,129,0.45)]"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t.completed} · {t.masteryReached} {Math.round(completed.mastery * 100)}%
                      <span className="ms-1 inline-flex items-center gap-1 rounded-md border border-success/30 bg-bg-elev px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-success">
                        <Zap className="h-2.5 w-2.5" />+{xpAward}
                      </span>
                      <CelebrationBurst />
                    </motion.div>
                  ) : (
                    <motion.button
                      key="cta"
                      type="button"
                      onClick={markComplete}
                      disabled={completing}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      whileHover={!completing ? { scale: 1.02 } : undefined}
                      whileTap={!completing ? { scale: 0.98 } : undefined}
                      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg border border-accent/40 bg-gradient-to-br from-accent via-accent to-fuchsia-500 px-4 py-2 text-sm font-medium text-bg shadow-[0_0_0_1px_rgba(167,139,250,0.3),0_8px_24px_-12px_rgba(139,92,246,0.55)] transition-shadow hover:shadow-[0_0_0_1px_rgba(167,139,250,0.5),0_12px_32px_-12px_rgba(139,92,246,0.75)] disabled:opacity-60"
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
                          <span className="inline-flex items-center gap-0.5 rounded border border-white/30 bg-white/15 px-1 py-px font-mono text-[10px] uppercase tracking-wider">
                            <Zap className="h-2.5 w-2.5" />+{xpAward}
                          </span>
                        </>
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>
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
    </>
  )
}

function LessonTopBar({
  title,
  xpAward,
  sectionsCount,
  locale,
}: {
  title: string
  xpAward: number
  sectionsCount: number
  locale: 'en' | 'ar'
}) {
  // Track reading progress as a 0..1 ratio across the document.
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight
      const ratio = docH > 0 ? window.scrollY / docH : 0
      setProgress(Math.min(1, Math.max(0, ratio)))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-xl">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5 origin-left bg-gradient-to-r from-accent via-fuchsia-400 to-accent transition-transform duration-150"
        style={{ transform: `scaleX(${progress})` }}
      />
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <p className="line-clamp-1 text-xs font-medium text-fg-muted sm:text-sm">{title}</p>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {sectionsCount} {locale === 'ar' ? 'أقسام' : 'sections'}
          </span>
          <span className="hidden sm:inline text-fg-subtle/50">·</span>
          <span className="hidden items-center gap-1 rounded-md border border-accent/30 bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent sm:inline-flex">
            <Zap className="h-2.5 w-2.5" />+{xpAward} XP
          </span>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ label, section }: { label: string; section: Section }) {
  const color = SECTION_COLORS[section]
  return (
    <div className="mb-5 flex items-center gap-3">
      <span
        className="h-px flex-1"
        style={{ background: `linear-gradient(to right, transparent, ${color}40)` }}
      />
      <span
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider"
        style={{ borderColor: `${color}40`, background: `${color}14`, color }}
      >
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        />
        {label}
      </span>
      <span
        className="h-px flex-1"
        style={{ background: `linear-gradient(to left, transparent, ${color}40)` }}
      />
    </div>
  )
}
