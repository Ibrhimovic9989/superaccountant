'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { applyForRecruiterAccessAction } from '@/lib/community/recruiter-actions'

/**
 * Small application form for recruiter access. Optimised for a quick
 * capture — three fields, one submit. Admin reviews it out-of-band.
 */

export function RecruiterApplyForm() {
  const [companyName, setCompanyName] = useState('')
  const [companyDomain, setCompanyDomain] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'ok' }
    | { kind: 'err'; msg: string }
  >({ kind: 'idle' })
  const [pending, startTransition] = useTransition()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await applyForRecruiterAccessAction({ companyName, companyDomain, notes })
      if (res.ok) {
        setStatus({ kind: 'ok' })
        setCompanyName('')
        setCompanyDomain('')
        setNotes('')
      } else {
        setStatus({ kind: 'err', msg: res.error })
      }
    })
  }

  if (status.kind === 'ok') {
    return (
      <div className="rounded-2xl border border-success/40 bg-success/10 p-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-wider text-success">Submitted</p>
        <p className="mt-2 text-sm text-fg">
          We'll email you when your access is approved — usually within 24 hours.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-bg-elev p-6">
      <div>
        <label
          htmlFor="companyName"
          className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-fg-subtle"
        >
          Company / firm
        </label>
        <input
          id="companyName"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. Deloitte India"
          className="w-full rounded-xl border border-border bg-bg p-3 text-sm outline-none focus:border-accent"
        />
      </div>
      <div>
        <label
          htmlFor="companyDomain"
          className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-fg-subtle"
        >
          Company domain
        </label>
        <input
          id="companyDomain"
          required
          value={companyDomain}
          onChange={(e) => setCompanyDomain(e.target.value)}
          placeholder="deloitte.com"
          className="w-full rounded-xl border border-border bg-bg p-3 text-sm outline-none focus:border-accent"
        />
      </div>
      <div>
        <label
          htmlFor="notes"
          className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-fg-subtle"
        >
          Who are you hiring for? (optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="Entry-level GST/audit roles in Bengaluru — 4 openings, immediate start."
          className="w-full resize-y rounded-xl border border-border bg-bg p-3 text-sm outline-none focus:border-accent"
        />
      </div>
      {status.kind === 'err' && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {status.msg}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin" />}
        Request access
      </button>
    </form>
  )
}
