'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowRight, Check, Command, MessageSquare, PenLine, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'

const STORAGE_KEY = 'sa.lesson.coachmark.dismissed'

type Step = {
  icon: React.ReactNode
  title: string
  body: string
  hint?: React.ReactNode
}

const STEPS: Record<'en' | 'ar', Step[]> = {
  en: [
    {
      icon: <PenLine className="h-4 w-4" />,
      title: 'Read, watch, then practise',
      body: 'Each lesson has a video, written explanation, a flowchart, a mindmap, and an 8-question practice set. Work through them in any order.',
    },
    {
      icon: <MessageSquare className="h-4 w-4" />,
      title: 'Stuck? Ask the tutor',
      body: 'The AI tutor knows this lesson cold. Ask for a worked example, an explanation, or to grade your written answer — it cites the lesson it learned from.',
      hint: (
        <span className="inline-flex items-center gap-1.5">
          <kbd className="rounded border border-border bg-bg-overlay px-1.5 py-0.5 font-mono text-[10px]">
            <Command className="inline h-2.5 w-2.5" />K
          </kbd>
          to open the tutor anytime
        </span>
      ),
    },
    {
      icon: <Check className="h-4 w-4" />,
      title: 'Mark complete to lock in mastery',
      body: "Once you finish the practice, hit Mark complete. Your mastery score updates and tomorrow's plan adapts to what you got wrong.",
    },
  ],
  ar: [
    {
      icon: <PenLine className="h-4 w-4" />,
      title: 'اقرأ، شاهد، ثم تمرّن',
      body: 'كل درس فيه فيديو، شرح مكتوب، مخطط انسيابي، خريطة ذهنية، ومجموعة من ٨ أسئلة تمرين. اعمل بالترتيب الذي تريد.',
    },
    {
      icon: <MessageSquare className="h-4 w-4" />,
      title: 'متعثر؟ اسأل المدرس',
      body: 'المدرس الذكي يعرف هذا الدرس جيداً. اطلب مثالاً محلولاً، شرحاً، أو لتصحيح إجابتك المكتوبة — ويستشهد بالدرس الذي تعلم منه.',
      hint: (
        <span className="inline-flex items-center gap-1.5">
          <kbd className="rounded border border-border bg-bg-overlay px-1.5 py-0.5 font-mono text-[10px]">
            <Command className="inline h-2.5 w-2.5" />K
          </kbd>
          لفتح المدرس في أي وقت
        </span>
      ),
    },
    {
      icon: <Check className="h-4 w-4" />,
      title: 'علّم كمكتمل لحفظ الإتقان',
      body: 'بعد أن تنهي التمارين، اضغط "تم الإكمال". يتم تحديث درجة إتقانك وتتكيف خطة الغد مع ما أخطأت فيه.',
    },
  ],
}

const COPY = {
  en: {
    eyebrow: 'Welcome',
    skip: 'Skip',
    next: 'Next',
    finish: 'Got it',
    progress: (i: number, n: number) => `${i} of ${n}`,
  },
  ar: {
    eyebrow: 'مرحباً',
    skip: 'تخطي',
    next: 'التالي',
    finish: 'فهمت',
    progress: (i: number, n: number) => `${i} من ${n}`,
  },
} as const

/**
 * One-time onboarding coachmark for the lesson page. Shows three steps in a
 * dismissible centered modal. Sets a localStorage flag on first dismiss so it
 * never shows again on this device.
 */
export function OnboardingCoachmark({ locale }: { locale: 'en' | 'ar' }) {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState(0)
  const t = COPY[locale]
  const steps = STEPS[locale]

  // Hydration-safe: only check storage after mount.
  React.useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') {
        // Tiny delay so the lesson content paints first.
        const id = setTimeout(() => setOpen(true), 600)
        return () => clearTimeout(id)
      }
    } catch {
      // localStorage unavailable (private mode etc.) — just don't show.
    }
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {}
    setOpen(false)
  }

  function next() {
    if (step < steps.length - 1) setStep(step + 1)
    else dismiss()
  }

  const current = steps[step]
  if (!current) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-bg/85 px-6 backdrop-blur-md"
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-bg-elev shadow-2xl shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  {t.eyebrow}
                </span>
                <span className="text-fg-subtle/40">·</span>
                <span className="font-mono text-[10px] tabular-nums text-fg-subtle">
                  {t.progress(step + 1, steps.length)}
                </span>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Close"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-7">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/30 bg-accent-soft text-accent">
                {current.icon}
              </div>
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
              >
                <h2 className="text-xl font-semibold tracking-tight">{current.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">{current.body}</p>
                {current.hint && <p className="mt-4 text-xs text-fg-subtle">{current.hint}</p>}
              </motion.div>
            </div>

            {/* Progress dots + footer */}
            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <div className="flex items-center gap-1.5">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'inline-block h-1 rounded-full transition-all',
                      i === step ? 'w-6 bg-accent' : 'w-1 bg-border',
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {step < steps.length - 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={dismiss}>
                    {t.skip}
                  </Button>
                )}
                <Button type="button" variant="accent" size="sm" onClick={next}>
                  {step === steps.length - 1 ? t.finish : t.next}
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
