'use client'

import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'

type Props = {
  /** Server action — captures the lead via createMarketingLead. */
  submit: (args: {
    name: string
    email: string
    phone: string
    goal: string
  }) => Promise<void>
}

const GOAL_OPTIONS = [
  { value: 'first-job', label: 'My first accounting job' },
  { value: 'switch-careers', label: 'Switching into accounting' },
  { value: 'upskill', label: 'Upskilling in my current role' },
  { value: 'own-business', label: 'Running my own business' },
  { value: 'exploring', label: 'Just exploring' },
] as const

export function EnrollForm({ submit }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [goal, setGoal] = useState<(typeof GOAL_OPTIONS)[number]['value']>('first-job')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (name.trim().length < 2) {
      setError('Please share your name.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("That email doesn't look right.")
      return
    }
    if (phone.replace(/\D/g, '').length < 7) {
      setError('A phone number lets us reach out about the next cohort.')
      return
    }
    startTransition(async () => {
      try {
        await submit({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          goal,
        })
        setDone(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not submit — try again.')
      }
    })
  }

  if (done) {
    return (
      <div className="rounded-2xl border-2 border-success/40 bg-success/5 p-8 text-center sm:p-12">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-success/40 bg-success/10">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          You're on the list, {name.split(' ')[0]}.
        </h3>
        <p className="mt-3 text-base text-fg-muted">
          Our team will reach out on <strong className="text-fg">{phone}</strong> within 24 hours
          with full cohort details, dates, and the next steps.
        </p>
        <p className="mt-3 text-xs text-fg-subtle">
          Meanwhile, check your inbox at <strong>{email}</strong> — we just sent a welcome note.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border-2 border-accent/40 bg-accent-soft/30 p-6 sm:p-8"
    >
      <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Apply for the next cohort
      </h3>
      <p className="mt-2 text-sm text-fg-muted sm:text-base">
        Limited seats. We'll call within 24 hours to walk you through the curriculum, schedule, and
        fee structure.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Your name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aisha Sharma"
            className={inputCls}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
        </Field>
        <Field label="Phone (WhatsApp preferred)" className="sm:col-span-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98xxx xxxxx"
            className={inputCls}
          />
        </Field>
        <Field label="Why you're joining" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGoal(opt.value)}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                  goal === opt.value
                    ? 'border-accent bg-accent text-bg'
                    : 'border-border bg-bg-elev text-fg hover:border-border-strong'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-7 py-4 text-base font-medium text-bg transition-colors hover:bg-accent/90 disabled:opacity-60 sm:w-auto"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            Apply for this cohort
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </>
        )}
      </button>
    </form>
  )
}

const inputCls =
  'block w-full rounded-lg border border-border bg-bg-elev px-4 py-3 text-base text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent'

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <div className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        {label}
      </div>
      {children}
    </div>
  )
}
