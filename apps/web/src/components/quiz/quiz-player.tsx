'use client'

import { QUIZ_BUCKETS, QUIZ_MAX_SCORE, QUIZ_QUESTIONS, scoreAnswers } from '@/lib/data/quiz'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
  Sparkles,
  Trophy,
  User,
} from 'lucide-react'
import { useState, useTransition } from 'react'

type Phase = 'intro' | 'quiz' | 'capture' | 'result'

type SubmitArgs = {
  name: string
  email: string
  phone: string
  score: number
  bucketKey: string
  answers: Record<string, string>
}

type Props = {
  /** Server action that persists the lead. Returns void; throws on failure. */
  submitLead: (args: SubmitArgs) => Promise<void>
}

export function QuizPlayer({ submitLead }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitPending, startSubmit] = useTransition()

  const total = QUIZ_QUESTIONS.length
  const current = QUIZ_QUESTIONS[stepIndex]
  const progressPct = phase === 'quiz' ? (stepIndex / total) * 100 : 0

  function pick(optionId: string) {
    if (!current) return
    const next = { ...answers, [current.id]: optionId }
    setAnswers(next)
    // Auto-advance after a short beat so the choice feels confirmed
    setTimeout(() => {
      if (stepIndex + 1 < total) {
        setStepIndex(stepIndex + 1)
      } else {
        setPhase('capture')
      }
    }, 180)
  }

  function goBack() {
    if (stepIndex === 0) {
      setPhase('intro')
      return
    }
    setStepIndex(stepIndex - 1)
  }

  function submit() {
    setError(null)
    if (name.trim().length < 2) {
      setError('Please tell us your name.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("That email doesn't look right.")
      return
    }
    const { score, bucket } = scoreAnswers(answers)
    startSubmit(async () => {
      try {
        await submitLead({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          score,
          bucketKey: bucket.key,
          answers,
        })
        setPhase('result')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong — try again.')
      }
    })
  }

  // ── Intro ────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14 text-center sm:py-20">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          <Sparkles className="h-3 w-3 text-accent" />
          2-minute career quiz
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
          The Accountant DNA Quiz
        </h1>
        <p className="mt-4 text-base text-fg-muted sm:text-lg">
          10 honest questions. Find out if you're built for the books — and what your specific
          strengths already are.
        </p>
        <p className="mt-3 text-sm text-fg-subtle">
          No CA prerequisite. No accounting jargon. Be honest — every answer is valid.
        </p>

        <button
          type="button"
          onClick={() => setPhase('quiz')}
          className="mt-10 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-7 py-4 text-base font-medium text-bg transition-colors hover:bg-accent/90"
        >
          Start the quiz
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </button>

        <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          ⌁ Takes ~2 minutes · {total} questions · {QUIZ_BUCKETS.length} result types
        </p>
      </div>
    )
  }

  // ── Question phase ───────────────────────────────────────
  if (phase === 'quiz' && current) {
    const chosen = answers[current.id]
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <div className="mb-6 flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            Question {stepIndex + 1} of {total}
          </span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-elev">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{current.prompt}</h2>

        <div className="mt-8 flex flex-col gap-3">
          {current.options.map((opt) => {
            const isChosen = chosen === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => pick(opt.id)}
                className={cn(
                  'group flex items-center justify-between gap-3 rounded-xl border px-5 py-4 text-start text-base transition-all',
                  isChosen
                    ? 'border-accent bg-accent-soft text-fg'
                    : 'border-border bg-bg-elev/40 text-fg hover:border-accent/50 hover:bg-accent-soft/30',
                )}
              >
                <span>{opt.label}</span>
                {isChosen ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
                ) : (
                  <ArrowRight className="h-4 w-4 shrink-0 text-fg-subtle transition-all group-hover:translate-x-0.5 group-hover:text-accent rtl:rotate-180" />
                )}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={goBack}
          className="mt-8 inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
          Back
        </button>
      </div>
    )
  }

  // ── Lead-capture phase ────────────────────────────────────
  if (phase === 'capture') {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:py-16">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-accent">
          <Trophy className="h-3 w-3" />
          Your result is ready
        </div>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Where should we send it?
        </h2>
        <p className="mt-3 text-sm text-fg-muted sm:text-base">
          We'll show your result on this page + email a copy you can come back to. One email. No
          spam. Unsubscribe any time.
        </p>

        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              <User className="h-3 w-3" />
              Your name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aisha Sharma"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              <Mail className="h-3 w-3" />
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              Phone (optional)
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98xxx xxxxx"
              className={inputCls}
            />
          </label>

          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={submitPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-base font-medium text-bg transition-colors hover:bg-accent/90 disabled:opacity-60"
          >
            {submitPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scoring…
              </>
            ) : (
              <>
                Show me my result
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  // ── Result phase ──────────────────────────────────────────
  const { score, bucket } = scoreAnswers(answers)
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <div className="text-center">
        <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full border border-accent/40 bg-accent-soft/60 text-5xl">
          {bucket.emoji}
        </div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-accent">
          {bucket.badge} · {score}/{QUIZ_MAX_SCORE}
        </p>
        <h2 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{bucket.title}</h2>
        <p className="mt-4 text-lg text-fg sm:text-xl">{bucket.headline}</p>
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-bg-elev/40 p-6 sm:p-8">
        <p className="text-base leading-relaxed text-fg-muted sm:text-lg">{bucket.body}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-bg-elev/40 p-6 sm:p-8">
        <h3 className="mb-4 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          What you already have going for you
        </h3>
        <ul className="space-y-2.5">
          {bucket.strengths.map((s) => (
            <li key={s} className="flex items-start gap-2.5 text-base text-fg">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 rounded-2xl border-2 border-accent/40 bg-accent-soft/30 p-6 sm:p-8">
        <p className="font-mono text-[10px] uppercase tracking-wider text-accent">Your next step</p>
        <p className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{bucket.ctaLine}</p>
        <p className="mt-2 text-sm text-fg-muted sm:text-base">
          Superaccountant — Get Job Ready: 45-day offline cohort + 24/7 AI tutor + placement
          assistance. Built for graduates and career switchers who are tired of being talked down
          to.
        </p>
        <a
          href="#enroll"
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-base font-medium text-bg transition-colors hover:bg-accent/90"
        >
          See cohort details
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </a>
      </div>

      <p className="mt-8 text-center text-xs text-fg-subtle">
        We've also emailed a copy of your result to <strong>{email}</strong>.
      </p>
    </div>
  )
}

const inputCls =
  'block w-full rounded-lg border border-border bg-bg-elev px-4 py-3 text-base text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent'
