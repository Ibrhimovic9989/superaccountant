'use client'

import type { Guide, GuideStep } from '@/lib/data/guides'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  Youtube,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Locale = 'en' | 'ar'
type Props = { guide: Guide; locale: Locale }

type StorageState = {
  currentStepId: string
  history: string[]
  completedAt?: string
}

const STORAGE_PREFIX = 'sa.guide.'

const COPY = {
  en: {
    step: 'Step',
    of: 'of',
    minutes: 'min',
    continue: 'Continue',
    finish: 'Finish',
    restart: 'Start over',
    restartConfirm: 'Restart this guide from the beginning?',
    previous: 'Back',
    estimatedTime: 'Estimated time',
    youllLearn: "You'll be able to",
    youllNeed: "What you'll need",
    startGuide: 'Start guide',
    troubleshoot: 'Troubleshooting',
    successTitle: "You're done!",
    youCompleted: 'You completed',
    cantFindStep: "Couldn't find that step. Resetting…",
    videoCaption: 'Video walkthrough',
    openOnYouTube: 'Open on YouTube',
  },
  ar: {
    step: 'الخطوة',
    of: 'من',
    minutes: 'د',
    continue: 'متابعة',
    finish: 'إنهاء',
    restart: 'البدء من جديد',
    restartConfirm: 'إعادة تشغيل هذا الدليل من البداية؟',
    previous: 'رجوع',
    estimatedTime: 'الوقت المقدّر',
    youllLearn: 'ستتمكن من',
    youllNeed: 'ما تحتاجه',
    startGuide: 'ابدأ الدليل',
    troubleshoot: 'استكشاف الأخطاء',
    successTitle: 'لقد انتهيت!',
    youCompleted: 'لقد أكملت',
    cantFindStep: 'تعذّر العثور على هذه الخطوة. جارٍ إعادة الضبط…',
    videoCaption: 'فيديو توضيحي',
    openOnYouTube: 'افتح في يوتيوب',
  },
} as const

const TILE_CLASSES: Record<Guide['color'], string> = {
  accent: 'border-accent/30 bg-accent-soft text-accent',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  success: 'border-success/30 bg-success/10 text-success',
  danger: 'border-danger/30 bg-danger/10 text-danger',
}

const CALLOUT_CLASSES: Record<NonNullable<GuideStep['callout']>['kind'], string> = {
  tip: 'border-accent/30 bg-accent-soft/40',
  warning: 'border-warning/30 bg-warning/5',
  success: 'border-success/30 bg-success/5',
}

// ── Sub-components ────────────────────────────────────────────

function IntroScreen({
  guide,
  t,
  onStart,
}: {
  guide: Guide
  t: (typeof COPY)[Locale]
  onStart: () => void
}) {
  const happyPathLength = guide.steps.filter((s) => s.label).length
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="flex items-start gap-4">
        <span
          className={cn(
            'inline-flex h-16 w-16 items-center justify-center rounded-2xl border text-3xl shrink-0',
            TILE_CLASSES[guide.color],
          )}
        >
          {guide.emoji}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">{guide.title}</h1>
          <p className="mt-1 text-sm text-fg-muted sm:text-base">{guide.subtitle}</p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            {t.estimatedTime}: ~{guide.estimatedMinutes} {t.minutes} · {happyPathLength}{' '}
            {t.step.toLowerCase()}s
          </p>
        </div>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-fg sm:text-base">{guide.hook}</p>

      {guide.outcomes.length > 0 && (
        <section className="mt-8 rounded-2xl border border-border bg-bg-elev/40 p-5">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            {t.youllLearn}
          </h2>
          <ul className="space-y-1.5">
            {guide.outcomes.map((o) => (
              <li key={o} className="flex items-start gap-2 text-sm text-fg">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {guide.prerequisites && guide.prerequisites.length > 0 && (
        <section className="mt-4 rounded-2xl border border-dashed border-border bg-bg-overlay/30 p-5">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            {t.youllNeed}
          </h2>
          <ul className="space-y-1.5 text-sm text-fg-muted">
            {guide.prerequisites.map((p) => (
              <li key={p}>· {p}</li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        onClick={onStart}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-medium text-bg transition-colors hover:bg-accent/90 sm:w-auto"
      >
        {t.startGuide}
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
      </button>
    </div>
  )
}

function CompletionScreen({
  guide,
  t,
  onRestart,
}: {
  guide: Guide
  t: (typeof COPY)[Locale]
  onRestart: () => void
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full border border-success/40 bg-success/10 text-4xl">
        🎉
      </div>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.successTitle}</h1>
      <p className="mt-3 text-sm text-fg-muted sm:text-base">
        {t.youCompleted} <span className="font-medium text-fg">{guide.title}</span>.
      </p>
      <div className="mt-8">
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm text-fg-muted transition-colors hover:bg-bg-elev hover:text-fg"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t.restart}
        </button>
      </div>
    </div>
  )
}

function StepCallout({ callout }: { callout: NonNullable<GuideStep['callout']> }) {
  return (
    <div
      className={cn(
        'mt-6 flex items-start gap-3 rounded-xl border p-4',
        CALLOUT_CLASSES[callout.kind],
      )}
    >
      <span className="mt-0.5 shrink-0">
        {callout.kind === 'tip' && <Lightbulb className="h-4 w-4 text-accent" />}
        {callout.kind === 'warning' && <TriangleAlert className="h-4 w-4 text-warning" />}
        {callout.kind === 'success' && <Sparkles className="h-4 w-4 text-success" />}
      </span>
      <p className="text-sm leading-relaxed text-fg">{callout.text}</p>
    </div>
  )
}

function StepVideo({
  video,
  t,
  fallbackTitle,
}: {
  video: NonNullable<GuideStep['video']>
  t: (typeof COPY)[Locale]
  fallbackTitle: string
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-bg-overlay/40 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-medium text-fg">
          <Youtube className="h-3.5 w-3.5 text-danger" />
          {video.caption ?? t.videoCaption}
        </div>
        <a
          href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] uppercase tracking-wider text-accent hover:underline"
        >
          {t.openOnYouTube}
        </a>
      </div>
      <div className="relative aspect-video bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
          title={video.caption ?? fallbackTitle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </div>
  )
}

function StepActions({
  step,
  t,
  onAdvance,
}: {
  step: GuideStep
  t: (typeof COPY)[Locale]
  onAdvance: (next: string | null) => void
}) {
  if (step.check) {
    return (
      <>
        <p className="mb-3 text-sm font-medium text-fg">{step.check.question}</p>
        <div className="flex flex-col gap-2">
          {step.check.options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => onAdvance(opt.next)}
              className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-overlay/40 px-4 py-3 text-start text-sm text-fg transition-all hover:border-accent/50 hover:bg-accent-soft/30"
            >
              <span>{opt.label}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle transition-all group-hover:translate-x-0.5 group-hover:text-accent rtl:rotate-180" />
            </button>
          ))}
        </div>
      </>
    )
  }

  if (step.terminal) {
    return (
      <button
        type="button"
        onClick={() => onAdvance(null)}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
      >
        {t.finish}
        <CheckCircle2 className="h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onAdvance(step.next ?? null)}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
    >
      {t.continue}
      <ArrowRight className="h-4 w-4 rtl:rotate-180" />
    </button>
  )
}

function StepScreen({
  step,
  guide,
  history,
  t,
  onAdvance,
  onBack,
  onRestart,
}: {
  step: GuideStep
  guide: Guide
  history: string[]
  t: (typeof COPY)[Locale]
  onAdvance: (next: string | null) => void
  onBack: () => void
  onRestart: () => void
}) {
  const isTroubleshoot = !step.label
  const happyPath = guide.steps.filter((s) => s.label)
  const happyIndex = happyPath.findIndex((s) => s.id === step.id)
  const progressPct =
    ((happyIndex < 0 ? 0 : happyIndex + (isTroubleshoot ? 0 : 1)) / Math.max(1, happyPath.length)) *
    100

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {/* Stepper / progress */}
      <div className="mb-6 flex items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {isTroubleshoot ? (
            <span className="inline-flex items-center gap-1.5 text-warning">
              <TriangleAlert className="h-3 w-3" />
              {t.troubleshoot}
            </span>
          ) : (
            <>
              {t.step} {happyIndex + 1} {t.of} {happyPath.length}
            </>
          )}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-elev">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-bg-elev hover:text-fg-muted"
          title={t.restart}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Step card */}
      <article className="rounded-2xl border border-border bg-bg-elev/30 p-6 sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{step.title}</h1>

        <div className="mt-4 prose prose-sm prose-invert max-w-none text-fg">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{step.body}</ReactMarkdown>
        </div>

        {step.image && (
          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <img src={step.image} alt={step.title} className="w-full" />
          </div>
        )}

        {step.video && <StepVideo video={step.video} t={t} fallbackTitle={step.title} />}

        {step.callout && <StepCallout callout={step.callout} />}

        <div className="mt-8 border-t border-border pt-6">
          <StepActions step={step} t={t} onAdvance={onAdvance} />
        </div>
      </article>

      {history.length > 0 && (
        <button
          type="button"
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
          {t.previous}
        </button>
      )}
    </div>
  )
}

// ── Top-level orchestrator ─────────────────────────────────────

export function GuidePlayer({ guide, locale }: Props) {
  const t = COPY[locale]
  const storageKey = `${STORAGE_PREFIX}${guide.slug}`

  const [state, setState] = useState<StorageState | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) setState(JSON.parse(raw))
    } catch {
      // corrupt storage → start fresh
    }
    setHydrated(true)
  }, [storageKey])

  useEffect(() => {
    if (!hydrated) return
    try {
      if (state) window.localStorage.setItem(storageKey, JSON.stringify(state))
      else window.localStorage.removeItem(storageKey)
    } catch {
      // storage may be full / disabled — non-fatal
    }
  }, [state, hydrated, storageKey])

  const currentStep: GuideStep | null = useMemo(() => {
    if (!state) return null
    return guide.steps.find((s) => s.id === state.currentStepId) ?? null
  }, [state, guide])

  function start() {
    setState({ currentStepId: guide.startStepId, history: [] })
  }

  function advanceTo(nextId: string | null) {
    if (!state || !currentStep) return
    if (nextId === null) {
      setState({ ...state, completedAt: new Date().toISOString() })
      return
    }
    setState({
      currentStepId: nextId,
      history: [...state.history, currentStep.id],
      completedAt: undefined,
    })
  }

  function goBack() {
    if (!state || state.history.length === 0) return
    const prev = state.history[state.history.length - 1]
    if (!prev) return
    setState({
      currentStepId: prev,
      history: state.history.slice(0, -1),
      completedAt: undefined,
    })
  }

  function restart() {
    if (!confirm(t.restartConfirm)) return
    setState({ currentStepId: guide.startStepId, history: [] })
  }

  if (!hydrated) {
    return <div className="mx-auto max-w-3xl px-4 py-12 text-fg-muted">…</div>
  }

  if (!state) return <IntroScreen guide={guide} t={t} onStart={start} />
  if (state.completedAt) return <CompletionScreen guide={guide} t={t} onRestart={restart} />

  if (!currentStep) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-fg-muted">{t.cantFindStep}</p>
        <button
          type="button"
          onClick={start}
          className="mt-4 rounded-xl border border-border px-5 py-2.5 text-sm hover:bg-bg-elev"
        >
          {t.restart}
        </button>
      </div>
    )
  }

  return (
    <StepScreen
      step={currentStep}
      guide={guide}
      history={state.history}
      t={t}
      onAdvance={advanceTo}
      onBack={goBack}
      onRestart={restart}
    />
  )
}
