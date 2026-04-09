'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Clock, Loader2, Send, Sparkles, Trophy } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { PUBLIC_CONFIG } from '@/lib/config/public'
import { Button } from '@/components/ui/button'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { BorderBeam } from '@/components/magicui/border-beam'
import { cn } from '@/lib/utils'

type Question = {
  questionId: string
  prompt: { en: string; ar: string }
  choices: { en: string; ar: string }[]
  difficulty: 'easy' | 'medium' | 'hard'
  lessonSlug: string
}

type StartResponse = {
  attemptId: string
  questions: Question[]
  timeLimitMinutes: number
  startedAt: string
}

type SubmitResponse = {
  attemptId: string
  score: number
  passed: boolean
  passThreshold: number
  correctCount: number
  total: number
  certificateHash?: string
}

type Props = { userId: string; locale: 'en' | 'ar' }

const COPY = {
  en: {
    introTitle: 'Ready when you are.',
    introBody: '30 questions · 3 hours · no tutor · pass mark 70%',
    start: 'Start exam',
    questionOf: (i: number, n: number) => `Question ${i} of ${n}`,
    previous: 'Previous',
    next: 'Next',
    submit: 'Submit exam',
    submitting: 'Grading…',
    loading: 'Loading exam…',
    error: 'Something went wrong',
    retry: 'Try again',
    passed: 'You passed.',
    failed: 'Not quite — try again.',
    scored: 'You scored',
    of: 'of',
    redirecting: 'Redirecting to your certificate…',
  },
  ar: {
    introTitle: 'جاهز عندما تكون مستعداً.',
    introBody: '٣٠ سؤالاً · ٣ ساعات · بدون مدرس · النسبة المطلوبة ٧٠٪',
    start: 'ابدأ الاختبار',
    questionOf: (i: number, n: number) => `السؤال ${i} من ${n}`,
    previous: 'السابق',
    next: 'التالي',
    submit: 'إرسال الاختبار',
    submitting: 'جارٍ التصحيح…',
    loading: 'جاري التحميل…',
    error: 'حدث خطأ ما',
    retry: 'حاول مرة أخرى',
    passed: 'لقد نجحت.',
    failed: 'لم تنجح — حاول مرة أخرى.',
    scored: 'حصلت على',
    of: 'من',
    redirecting: 'سيتم تحويلك إلى شهادتك…',
  },
} as const

export function GrandTestRunner({ userId, locale }: Props) {
  const router = useRouter()
  const t = COPY[locale]
  const [state, setState] = useState<'idle' | 'loading' | 'inProgress' | 'submitting' | 'done'>(
    'idle',
  )
  const [data, setData] = useState<StartResponse | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [idx, setIdx] = useState(0)
  const [result, setResult] = useState<SubmitResponse | null>(null)
  const [remaining, setRemaining] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!data || state !== 'inProgress') return
    const deadline = new Date(data.startedAt).getTime() + data.timeLimitMinutes * 60 * 1000
    const tick = () => setRemaining(Math.max(0, Math.floor((deadline - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [data, state])

  useEffect(() => {
    if (state === 'inProgress' && remaining === 0 && data) void submit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, state])

  async function start() {
    setState('loading')
    setError(null)
    try {
      const res = await fetch(`${PUBLIC_CONFIG.apiUrl}/grand-test/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) throw new Error(`api ${res.status}`)
      const d: StartResponse = await res.json()
      setData(d)
      setState('inProgress')
    } catch (err) {
      setError((err as Error).message)
      setState('idle')
    }
  }

  async function submit() {
    if (!data) return
    setState('submitting')
    try {
      const res = await fetch(`${PUBLIC_CONFIG.apiUrl}/grand-test/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId, attemptId: data.attemptId, answers }),
      })
      if (!res.ok) throw new Error(`api ${res.status}`)
      const r: SubmitResponse = await res.json()
      setResult(r)
      setState('done')
      if (r.passed && r.certificateHash) {
        setTimeout(() => router.push(`/${locale}/certificate/${r.certificateHash}`), 2500)
      }
    } catch (err) {
      setError((err as Error).message)
      setState('inProgress')
    }
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6">
        <p className="font-mono text-[10px] uppercase tracking-wider text-danger">{t.error}</p>
        <p className="mt-2 text-sm text-fg-muted">{error}</p>
        <Button type="button" variant="secondary" className="mt-4" onClick={() => setError(null)}>
          {t.retry}
        </Button>
      </div>
    )
  }

  if (state === 'idle') {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border bg-bg-elev p-10 sm:p-14 text-center">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg">
          <Trophy className="h-6 w-6 text-accent" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.introTitle}</h2>
        <p className="mt-3 text-sm text-fg-muted">{t.introBody}</p>
        <Button type="button" variant="accent" size="lg" className="mt-8" onClick={start}>
          {t.start}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Button>
      </div>
    )
  }

  if (state === 'loading' || !data) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-bg-elev p-12 text-sm text-fg-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t.loading}
      </div>
    )
  }

  if (state === 'done' && result) {
    const pct = Math.round(result.score * 100)
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-bg-elev p-10 sm:p-14 text-center"
      >
        <div
          className={cn(
            'mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider',
            result.passed
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-danger/30 bg-danger/10 text-danger',
          )}
        >
          <Sparkles className="h-3 w-3" />
          {result.passed ? t.passed : t.failed}
        </div>
        <div className="mt-6 flex items-baseline justify-center gap-1">
          <NumberTicker value={pct} className="font-mono text-6xl font-medium tracking-tight" />
          <span className="font-mono text-2xl text-fg-subtle">%</span>
        </div>
        <p className="mt-4 text-sm text-fg-muted">
          {t.scored} {result.correctCount} {t.of} {result.total}
        </p>
        {result.passed && result.certificateHash ? (
          <p className="mt-6 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {t.redirecting}
          </p>
        ) : null}
        {result.passed && (
          <BorderBeam size={80} duration={8} colorFrom="#a78bfa" colorTo="#8b5cf6" />
        )}
      </motion.div>
    )
  }

  // In progress
  const question = data.questions[idx]
  if (!question) return null
  const total = data.questions.length
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const studentAnswerEn = answers[question.questionId]
  const progressPct = Math.round(((idx + 1) / total) * 100)
  const lowTime = remaining < 600

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-elev">
      {/* Header */}
      <div className="border-b border-border bg-bg-overlay px-6 py-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted tabular-nums">
            {t.questionOf(idx + 1, total)}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 font-mono text-[11px] tabular-nums',
              lowTime ? 'text-danger' : 'text-fg-muted',
            )}
          >
            <Clock className="h-3 w-3" />
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-bg">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
          />
        </div>
      </div>

      {/* Body */}
      <div className="p-6 sm:p-8">
        <div className="mb-5 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          <span
            className={cn(
              question.difficulty === 'easy' && 'text-success',
              question.difficulty === 'medium' && 'text-warning',
              question.difficulty === 'hard' && 'text-danger',
            )}
          >
            {question.difficulty}
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={question.questionId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <p className="text-lg leading-relaxed text-fg sm:text-xl">
              {locale === 'ar' ? question.prompt.ar : question.prompt.en}
            </p>
            <div className="mt-6 grid gap-2">
              {question.choices.map((c, i) => {
                const text = locale === 'ar' ? c.ar : c.en
                const enText = c.en
                const selected = studentAnswerEn === enText
                const letter = String.fromCharCode(65 + i)
                return (
                  <label
                    key={i}
                    className={cn(
                      'group flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-all',
                      selected
                        ? 'border-accent bg-accent-soft'
                        : 'border-border hover:border-border-strong hover:bg-bg-overlay',
                    )}
                  >
                    <input
                      type="radio"
                      name={question.questionId}
                      checked={selected}
                      onChange={() =>
                        setAnswers({ ...answers, [question.questionId]: enText })
                      }
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-[10px] font-bold transition-colors',
                        selected
                          ? 'border-accent bg-accent text-accent-fg'
                          : 'border-border bg-bg-elev text-fg-muted group-hover:border-border-strong',
                      )}
                    >
                      {letter}
                    </span>
                    <span className="flex-1 leading-relaxed">{text}</span>
                  </label>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-bg-overlay px-6 py-4">
        <Button
          type="button"
          variant="ghost"
          disabled={idx === 0}
          onClick={() => setIdx(idx - 1)}
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t.previous}
        </Button>
        {idx < total - 1 ? (
          <Button type="button" variant="accent" onClick={() => setIdx(idx + 1)}>
            {t.next}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="accent"
            onClick={submit}
            disabled={state === 'submitting'}
          >
            {state === 'submitting' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.submitting}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {t.submit}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
