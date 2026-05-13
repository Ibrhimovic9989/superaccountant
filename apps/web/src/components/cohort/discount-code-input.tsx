'use client'

import { CheckCircle2, Loader2, TicketPercent } from 'lucide-react'
import { useState } from 'react'

/**
 * Collapsible "Have a discount code?" row used inside the apply-and-pay
 * form. Lives in its own file so the parent component stays under
 * biome's complexity + 500-line budgets.
 *
 * Codes are never enumerated client-side — we only render the outcome
 * of the parent-supplied server action.
 */

export type DiscountApplyResponse =
  | { ok: true; discountPercent: number; discountedAmountMinor: number; isFree: boolean }
  | { ok: false; reason: string }

export type AppliedDiscount = {
  code: string
  discountPercent: number
  finalAmountMinor: number
  isFree: boolean
}

type Props = {
  cohortId: string
  applied: AppliedDiscount | null
  onApply: (next: AppliedDiscount) => void
  onClear: () => void
  applyDiscountCode: (input: {
    cohortId: string
    code: string
  }) => Promise<DiscountApplyResponse>
}

export function DiscountCodeInput({
  cohortId,
  applied,
  onApply,
  onClear,
  applyDiscountCode,
}: Props) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [applying, setApplying] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleApply() {
    setErr(null)
    const trimmed = code.trim()
    if (trimmed.length < 3) {
      setErr('Enter a code.')
      return
    }
    setApplying(true)
    try {
      const res = await applyDiscountCode({ cohortId, code: trimmed })
      if (!res.ok) {
        setErr(reasonCopy(res.reason))
        return
      }
      onApply({
        code: trimmed,
        discountPercent: res.discountPercent,
        finalAmountMinor: res.discountedAmountMinor,
        isFree: res.isFree,
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not validate code.')
    } finally {
      setApplying(false)
    }
  }

  if (applied) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">
          <p className="font-medium">
            Code applied · {applied.discountPercent}% off
            {applied.isFree ? ' (free enrolment)' : ''}
          </p>
          <button
            type="button"
            onClick={() => {
              onClear()
              setCode('')
              setErr(null)
            }}
            className="mt-0.5 text-xs underline-offset-2 hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-muted transition-colors hover:text-fg"
      >
        <TicketPercent className="h-3.5 w-3.5" />
        Have a discount code?
      </button>
    )
  }

  return (
    <div>
      <div className="mb-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        <TicketPercent className="h-3 w-3 text-accent" />
        Discount code
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter your code"
          autoComplete="off"
          spellCheck={false}
          className="block w-full flex-1 rounded-lg border border-border bg-bg-elev px-4 py-3 text-base text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent"
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={applying || code.trim().length < 3}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-bg-elev px-4 py-3 text-sm font-medium text-fg transition-colors hover:bg-bg-overlay disabled:opacity-60"
        >
          {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>Apply</>}
        </button>
      </div>
      {err && (
        <p className="mt-2 text-xs text-danger" role="alert">
          {err}
        </p>
      )}
    </div>
  )
}

function reasonCopy(reason: string): string {
  switch (reason) {
    case 'unknown':
      return "That code doesn't exist."
    case 'inactive':
      return 'That code is no longer active.'
    case 'exhausted':
      return 'That code has been used up.'
    case 'not_started':
      return "That code isn't active yet."
    case 'expired':
      return 'That code has expired.'
    case 'wrong_cohort':
      return "That code isn't valid for this cohort."
    case 'partial_not_supported':
      return "That code isn't supported here yet — please contact us."
    default:
      return "That code can't be applied right now."
  }
}
