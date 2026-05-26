'use client'

import { CheckCircle2, FileUp, Loader2, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { SupportedLocale } from '@sa/i18n'

type Props = {
  locale: SupportedLocale
  jobId: string
  grandTestScore: number
  cohortPhase: number
  uploadAndSubmit: (form: FormData) => Promise<{ ok: boolean; error?: string }>
}

/**
 * Client-side wrapper around the server action. Handles the file
 * input + cover letter, runs the action inside useTransition, and
 * redirects on success.
 */
export function ApplyForm({
  locale,
  jobId,
  grandTestScore,
  cohortPhase,
  uploadAndSubmit,
}: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!file) {
      setError('Attach a PDF resume to apply.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Resume must be 10MB or less.')
      return
    }
    const fd = new FormData()
    fd.append('resume', file)
    fd.append('coverLetter', coverLetter)
    startTransition(async () => {
      const res = await uploadAndSubmit(fd)
      if (!res.ok) {
        setError(errorCopy(res.error))
        return
      }
      router.push(`/${locale}/jobs/${jobId}?applied=1`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* ── Snapshot the company will see ─────────────────────── */}
      <div className="rounded-xl border border-success/30 bg-success/10 p-4">
        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-success">
          <ShieldCheck className="h-3 w-3" />
          The company will see
        </p>
        <ul className="mt-2 space-y-1 text-sm text-fg">
          <li>· Grand test score: <strong>{Math.round(grandTestScore * 100)}%</strong></li>
          <li>· Cohort phase reached: <strong>{cohortPhase > 0 ? `Phase ${cohortPhase}` : 'In progress'}</strong></li>
          <li>· Your name, email, and phone (from your profile)</li>
          <li>· Your resume + cover letter (below)</li>
        </ul>
      </div>

      {/* ── Resume file ───────────────────────────────────────── */}
      <label className="block">
        <span className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          <FileUp className="h-3 w-3" />
          Resume (PDF, ≤ 10MB)
        </span>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full rounded-lg border border-border bg-bg-elev px-4 py-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-bg file:text-xs file:font-medium hover:file:bg-accent/90"
        />
        {file && (
          <p className="mt-1.5 text-xs text-fg-subtle">
            Selected: {file.name} ({Math.round(file.size / 1024)} KB)
          </p>
        )}
      </label>

      {/* ── Cover letter ──────────────────────────────────────── */}
      <label className="block">
        <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          Cover note (optional)
        </span>
        <textarea
          rows={6}
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          maxLength={4000}
          placeholder="Why are you a fit for this role? Keep it short."
          className="block w-full resize-y rounded-lg border border-border bg-bg-elev px-4 py-3 text-sm outline-none placeholder:text-fg-subtle focus:border-accent"
        />
        <p className="mt-1 text-right text-xs text-fg-subtle">{coverLetter.length} / 4000</p>
      </label>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !file}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-base font-medium text-bg transition-colors hover:bg-accent/90 disabled:opacity-60 sm:w-auto"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Submit application
          </>
        )}
      </button>
    </form>
  )
}

function errorCopy(code: string | undefined): string {
  switch (code) {
    case 'missing_resume':
      return 'Attach a PDF resume to continue.'
    case 'not_enrolled':
      return 'You need a paid cohort enrolment to apply.'
    case 'grand_test_not_passed':
      return 'You need a passing grand-test score to apply.'
    case 'already_applied':
      return 'You\'ve already applied to this job.'
    case 'job_not_open':
      return 'This job is no longer accepting applications.'
    default:
      return 'Could not submit your application. Try again in a moment.'
  }
}
