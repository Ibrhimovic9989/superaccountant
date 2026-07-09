'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { approveRecruiterAction } from '@/lib/community/recruiter-actions'

/**
 * Approve button for the admin review page. Optimistic — flips to
 * "Approved" the moment the click lands so the admin can steam through
 * a queue of pending applications without waiting on the network.
 */

export function AdminRecruiterApprovalRow({ userId }: { userId: string }) {
  const [approved, setApproved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (approved) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-success">
        <Check className="h-3 w-3" />
        Approved
      </span>
    )
  }

  const onClick = () => {
    setError(null)
    startTransition(async () => {
      const res = await approveRecruiterAction({ userId })
      if (res.ok) setApproved(true)
      else setError(res.error)
    })
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="font-mono text-[10px] uppercase tracking-wider text-danger">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin" />}
        Approve
      </button>
    </div>
  )
}
