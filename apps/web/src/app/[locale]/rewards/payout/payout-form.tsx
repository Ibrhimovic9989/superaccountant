'use client'

import type { SupportedCurrency } from '@/lib/loyalty/conversion'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useTransition } from 'react'

/**
 * Bank-details form for the cheque-payout request. Client component so
 * the submit button can show a pending spinner via useTransition —
 * useful when the server action also runs the email send before
 * redirecting.
 */
export function PayoutForm({
  submitAction,
  currency,
}: {
  submitAction: (formData: FormData) => Promise<void>
  currency: SupportedCurrency
}) {
  const [pending, startTransition] = useTransition()
  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await submitAction(formData)
        })
      }}
      className="mt-8 space-y-4 rounded-2xl border border-border bg-bg-elev/40 p-6"
    >
      <h2 className="text-base font-semibold tracking-tight">Bank details</h2>
      {currency === 'SAR' && (
        <p className="rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
          SAR payouts are handled offline. Submit the form and we&apos;ll reach out within 5
          business days to confirm transfer details.
        </p>
      )}
      <Field
        name="accountHolderName"
        label="Account holder name"
        placeholder="As printed on your passbook"
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="ifsc"
          label="IFSC / SWIFT code"
          placeholder={currency === 'INR' ? 'e.g. HDFC0001234' : 'e.g. NCBKSAJE'}
          required
        />
        <Field name="bankName" label="Bank name" placeholder="e.g. HDFC Bank" required />
      </div>
      <Field name="accountNumber" label="Account number" placeholder="Numbers only" required />
      <Field name="upiId" label="UPI ID (optional, India only)" placeholder="e.g. you@upi" />
      <p className="text-[11px] leading-relaxed text-fg-subtle">
        Your account details are encrypted at rest using AES-256-GCM. Only the admin who processes
        your payout can see them.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-bg hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        )}
        {pending ? 'Submitting…' : 'Request cash payout'}
      </button>
    </form>
  )
}

function Field({
  name,
  label,
  placeholder,
  required,
}: {
  name: string
  label: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        {label}
        {required && <span className="ms-1 text-danger">*</span>}
      </span>
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="w-full rounded-lg border border-border bg-bg-overlay px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
      />
    </label>
  )
}
