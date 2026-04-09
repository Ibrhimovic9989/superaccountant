'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { PUBLIC_CONFIG } from '@/lib/config/public'
import { Button } from '@/components/ui/button'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { BorderBeam } from '@/components/magicui/border-beam'
import { cn } from '@/lib/utils'

type Question = {
  id?: string
  prompt: string
  choices: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  topic: string
  answerIndex: number
  explanation: string
}
type HistoryItem = {
  question: Question
  studentAnswerIndex: number
  isCorrect: boolean
  askedAt: string
}
type StartResponse = { sessionId: string; question: Question; index: number; total: number }
type AnswerResponse =
  | { kind: 'next'; question: Question; index: number; total: number }
  | { kind: 'done'; score: number; placedPhase: number; summary: string }

type Props = {
  userId: string
  market: 'india' | 'ksa'
  locale: 'en' | 'ar'
}

const COPY = {
  en: {
    headerLabel: 'Placement test',
    questionOf: (i: number, n: number) => `Question ${i} of ${n}`,
    topic: 'Topic',
    difficulty: 'Difficulty',
    submit: 'Submit',
    loading: 'Loading next question…',
    starting: 'Starting placement test…',
    error: 'Something went wrong',
    retry: 'Try again',
    doneTitle: "You're placed.",
    doneSub: (score: number) => `You scored ${score}%`,
    donePhase: (n: number) => `We're starting you in Phase ${n}.`,
    doneCta: 'Go to dashboard',
  },
  ar: {
    headerLabel: 'اختبار التحديد',
    questionOf: (i: number, n: number) => `السؤال ${i} من ${n}`,
    topic: 'الموضوع',
    difficulty: 'الصعوبة',
    submit: 'إرسال',
    loading: 'جاري تحميل السؤال التالي…',
    starting: 'جاري بدء اختبار التحديد…',
    error: 'حدث خطأ ما',
    retry: 'حاول مرة أخرى',
    doneTitle: 'تم تحديدك.',
    doneSub: (score: number) => `حصلت على ${score}%`,
    donePhase: (n: number) => `سنبدأ بك في المرحلة ${n}.`,
    doneCta: 'اذهب إلى لوحة التحكم',
  },
} as const

export function EntryTestRunner({ userId, market, locale }: Props) {
  const router = useRouter()
  const t = COPY[locale]
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [index, setIndex] = useState(0)
  const [total, setTotal] = useState(10)
  const [choice, setChoice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState<{
    score: number
    placedPhase: number
    summary: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${PUBLIC_CONFIG.apiUrl}/entry-test/start`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userId, market, locale }),
        })
        if (!res.ok) throw new Error(`api ${res.status}`)
        const data: StartResponse = await res.json()
        if (cancelled) return
        setSessionId(data.sessionId)
        setQuestion(data.question)
        setIndex(data.index)
        setTotal(data.total)
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, market, locale])

  async function submit() {
    if (!sessionId || !question || choice === null) return
    setLoading(true)
    try {
      const res = await fetch(`${PUBLIC_CONFIG.apiUrl}/entry-test/answer`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId,
          market,
          locale,
          question,
          choiceIndex: choice,
          priorHistory: history,
        }),
      })
      if (!res.ok) throw new Error(`api ${res.status}`)
      const data: AnswerResponse = await res.json()
      setHistory((prev) => [
        ...prev,
        {
          question,
          studentAnswerIndex: choice,
          isCorrect: choice === question.answerIndex,
          askedAt: new Date().toISOString(),
        },
      ])
      if (data.kind === 'done') {
        setDone({ score: data.score, placedPhase: data.placedPhase, summary: data.summary })
      } else {
        setQuestion(data.question)
        setIndex(data.index)
        setTotal(data.total)
        setChoice(null)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Done state ─────────────────────────────────────────────
  if (done) {
    const pct = Math.round(done.score * 100)
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-bg-elev p-10 sm:p-14 text-center"
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-success">
          <Sparkles className="h-3 w-3" />
          {locale === 'ar' ? 'اكتمل' : 'Placement complete'}
        </div>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.doneTitle}</h2>
        <div className="mt-6 flex items-baseline justify-center gap-1">
          <NumberTicker
            value={pct}
            className="font-mono text-6xl font-medium tracking-tight"
          />
          <span className="font-mono text-2xl text-fg-subtle">%</span>
        </div>
        <p className="mt-4 text-sm text-fg-muted">{t.donePhase(done.placedPhase)}</p>
        <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-fg-muted">
          {done.summary}
        </p>
        <Button
          type="button"
          variant="accent"
          size="lg"
          className="mt-10"
          onClick={() => router.push(`/${locale}/dashboard`)}
        >
          {t.doneCta}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Button>
        <BorderBeam size={80} duration={8} colorFrom="#a78bfa" colorTo="#8b5cf6" />
      </motion.div>
    )
  }

  // ─── Error state ─────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6">
        <p className="font-mono text-[10px] uppercase tracking-wider text-danger">{t.error}</p>
        <p className="mt-2 text-sm text-fg-muted">{error}</p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          {t.retry}
        </Button>
      </div>
    )
  }

  // ─── Loading first question ──────────────────────────────────
  if (loading && !question) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-bg-elev p-12 text-sm text-fg-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t.starting}
      </div>
    )
  }

  if (!question) return null

  // ─── Question state ──────────────────────────────────────────
  const progressPct = Math.round((index / total) * 100)

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-elev">
      {/* Header strip */}
      <div className="border-b border-border bg-bg-overlay px-6 py-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              {t.headerLabel} · {market.toUpperCase()}
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted tabular-nums">
            {t.questionOf(index, total)}
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
        <div className="mb-5 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          <span>
            {t.topic} · <span className="text-fg-muted">{question.topic}</span>
          </span>
          <span className="text-fg-subtle/40">·</span>
          <span>
            {t.difficulty} ·{' '}
            <span
              className={cn(
                question.difficulty === 'easy' && 'text-success',
                question.difficulty === 'medium' && 'text-warning',
                question.difficulty === 'hard' && 'text-danger',
              )}
            >
              {question.difficulty}
            </span>
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${sessionId}-${index}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <p className="text-lg leading-relaxed text-fg sm:text-xl">{question.prompt}</p>

            <div className="mt-6 grid gap-2">
              {question.choices.map((c, i) => {
                const selected = choice === i
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
                      name="choice"
                      checked={selected}
                      onChange={() => setChoice(i)}
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
                    <span className="flex-1 leading-relaxed">{c}</span>
                  </label>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-border bg-bg-overlay px-6 py-4">
        <Button
          type="button"
          variant="accent"
          size="lg"
          disabled={choice === null || loading}
          onClick={submit}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.loading}
            </>
          ) : (
            <>
              {t.submit}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
