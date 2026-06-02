'use client'

import type { BankDetails } from '@/lib/loyalty/payout-crypto'
import type { PayoutWithUser } from '@/lib/loyalty/payout-store'
import { Banknote, CheckCircle2, Coins, Mail, ShieldX, User } from 'lucide-react'
import { useState } from 'react'

/**
 * Single open-payout card with three actions: Approve, Mark Paid (with
 * reference notes), Reject (with reason). Client component so the
 * reject + mark-paid sub-forms can toggle open without a page round-trip.
 */
export function PayoutRow({
  row,
  bank,
  approveAction,
  markPaidAction,
  rejectAction,
}: {
  row: PayoutWithUser
  bank: { details: BankDetails; masked: string } | null
  approveAction: (formData: FormData) => Promise<void>
  markPaidAction: (formData: FormData) => Promise<void>
  rejectAction: (formData: FormData) => Promise<void>
}) {
  const [openForm, setOpenForm] = useState<'paid' | 'reject' | null>(null)
  const amount = formatMoney(row.amountMinor, row.currency)
  return (
    <div className="rounded-2xl border-2 border-accent/30 bg-accent-soft/20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">
            {row.userName ?? row.userEmail.split('@')[0]}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {row.userEmail}
            </span>
            <span className="inline-flex items-center gap-1">
              <Coins className="h-3 w-3 text-success" />
              {row.points.toLocaleString()} SA
            </span>
            <span className="inline-flex items-center gap-1">
              <Banknote className="h-3 w-3 text-success" />
              <strong className="text-fg">{amount}</strong>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {row.status}
            </span>
            <span className="font-mono text-[10px] text-fg-subtle">
              {new Date(row.createdAt).toLocaleString()}
            </span>
          </p>
        </div>
      </div>

      {/* ── Bank details (decrypted in the server component) ──── */}
      {bank ? (
        <details className="mt-4 rounded-xl border border-border bg-bg-elev/60 p-3 text-xs">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-fg-subtle hover:text-fg">
            <User className="me-1 inline h-3 w-3" />
            Bank details · {bank.masked}
          </summary>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            <DetailRow label="Holder" value={bank.details.accountHolderName} />
            <DetailRow label="Bank" value={bank.details.bankName} />
            <DetailRow label="IFSC / SWIFT" value={bank.details.ifsc} mono />
            <DetailRow label="Account #" value={bank.details.accountNumber} mono />
            {bank.details.upiId && <DetailRow label="UPI" value={bank.details.upiId} mono />}
          </dl>
        </details>
      ) : (
        <p className="mt-3 text-xs text-fg-subtle">No bank details on file.</p>
      )}

      {/* ── Action buttons ─────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {row.status === 'requested' && (
          <form action={approveAction}>
            <input type="hidden" name="id" value={row.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/20"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve
            </button>
          </form>
        )}
        <button
          type="button"
          onClick={() => setOpenForm(openForm === 'paid' ? null : 'paid')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-sm font-medium text-bg hover:bg-success/90"
        >
          <Banknote className="h-3.5 w-3.5" />
          Mark paid…
        </button>
        <button
          type="button"
          onClick={() => setOpenForm(openForm === 'reject' ? null : 'reject')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/20"
        >
          <ShieldX className="h-3.5 w-3.5" />
          Reject…
        </button>
      </div>

      {openForm === 'paid' && (
        <form action={markPaidAction} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={row.id} />
          <input
            type="text"
            name="notes"
            placeholder="Cheque #, UTR or transfer reference"
            maxLength={200}
            className="flex-1 min-w-[16rem] rounded-md border border-border bg-bg-elev px-3 py-1.5 text-sm outline-none focus:border-success"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-sm font-medium text-bg hover:bg-success/90"
          >
            Confirm paid
          </button>
        </form>
      )}

      {openForm === 'reject' && (
        <form action={rejectAction} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={row.id} />
          <input
            type="text"
            name="reason"
            placeholder="Reason (shown to student in email)"
            required
            maxLength={500}
            className="flex-1 min-w-[16rem] rounded-md border border-border bg-bg-elev px-3 py-1.5 text-sm outline-none focus:border-danger"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/20"
          >
            Confirm reject + refund
          </button>
        </form>
      )}
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{label}</dt>
      <dd className={`mt-0.5 ${mono ? 'font-mono' : ''} text-fg`}>{value}</dd>
    </div>
  )
}

function formatMoney(amountMinor: number, currency: 'INR' | 'SAR'): string {
  const major = Math.round(amountMinor / 100)
  return currency === 'INR' ? `₹${major.toLocaleString('en-IN')}` : `﷼${major.toLocaleString()}`
}
