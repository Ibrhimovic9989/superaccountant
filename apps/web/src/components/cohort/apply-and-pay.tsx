'use client'

import { ArrowRight, CheckCircle2, CreditCard, Loader2, ShieldCheck } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import {
  type AppliedDiscount,
  type DiscountApplyResponse,
  DiscountCodeInput,
} from './discount-code-input'

/**
 * Two-step apply-and-pay flow for a cohort:
 *
 *   1. Collect name / email / phone / goal → server action creates the
 *      CohortApplication (pending) + a Razorpay order, returns the order
 *      id + the public Razorpay key.
 *   2. We load Razorpay's Checkout script, open the modal with the order
 *      id, and on success POST back to the server to verify the signature.
 *      The application moves from `pending` → `paid`.
 *
 * If the user closes the modal we leave the application in `pending` — they
 * can retry by re-submitting the form (server action will UPSERT a fresh
 * order against the same email).
 */

type CreateOrderResponse = {
  applicationId: string
  orderId: string
  amountMinor: number
  currency: string
  keyId: string
}

type VerifyResponse = { ok: true } | { ok: false; error: string }

type EnrollFreeResponse = { ok: true } | { ok: false; error: string }

type Props = {
  cohortId: string
  cohortName: string
  amountMinor: number
  originalPriceMinor: number
  currency: 'INR' | 'SAR'
  priceLabel: string
  originalPriceLabel: string
  /**
   * Server action: creates the CohortApplication + Razorpay order.
   * Returns the order details the browser needs to open Checkout.
   */
  createOrder: (input: {
    cohortId: string
    name: string
    email: string
    phone: string
    goal: string
  }) => Promise<CreateOrderResponse>
  /**
   * Server action: verifies the Razorpay HMAC signature and marks
   * the application as paid. Returns ok=true on success.
   */
  verifyPayment: (input: {
    razorpayOrderId: string
    razorpayPaymentId: string
    razorpaySignature: string
  }) => Promise<VerifyResponse>
  /**
   * Server action: validate a discount code against the active cohort.
   * Codes are never enumerated to the client — only validation results.
   */
  applyDiscountCode: (input: {
    cohortId: string
    code: string
  }) => Promise<DiscountApplyResponse>
  /**
   * Server action: 100%-off enrolment that skips Razorpay entirely.
   * Server re-validates the code, atomically consumes a use, and
   * inserts a paid CohortApplication directly.
   */
  enrollFree: (input: {
    cohortId: string
    name: string
    email: string
    phone: string
    goal: string
    code: string
  }) => Promise<EnrollFreeResponse>
}

const GOAL_OPTIONS = [
  { value: 'first-job', label: 'My first accounting job' },
  { value: 'switch-careers', label: 'Switching into accounting' },
  { value: 'upskill', label: 'Upskilling in my current role' },
  { value: 'own-business', label: 'Running my own business' },
  { value: 'exploring', label: 'Just exploring' },
] as const

// Razorpay Checkout — globally available once the script loads.
type RazorpayOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill?: { name?: string; email?: string; contact?: string }
  theme?: { color?: string }
  handler: (response: {
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_signature: string
  }) => void
  modal?: { ondismiss?: () => void; escape?: boolean }
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void }
  }
}

export function ApplyAndPay({
  cohortId,
  cohortName,
  amountMinor,
  originalPriceMinor,
  currency,
  priceLabel,
  originalPriceLabel,
  createOrder,
  verifyPayment,
  applyDiscountCode,
  enrollFree,
}: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [goal, setGoal] = useState<(typeof GOAL_OPTIONS)[number]['value']>('first-job')
  const [error, setError] = useState<string | null>(null)
  const [paid, setPaid] = useState(false)
  const [pending, startTransition] = useTransition()

  // Discount-code state — server is authoritative; we just cache its
  // validation response so we can show the user the new price.
  const [applied, setApplied] = useState<AppliedDiscount | null>(null)

  // Effective price for display + payment.
  const effectiveAmountMinor = applied ? applied.finalAmountMinor : amountMinor
  const effectivePriceLabel = applied ? formatMinor(effectiveAmountMinor, currency) : priceLabel
  const discountPct = Math.round(
    ((originalPriceMinor - effectiveAmountMinor) / originalPriceMinor) * 100,
  )

  // Lazy-load Razorpay Checkout once on mount.
  useEffect(() => {
    if (window.Razorpay) return
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      // We deliberately don't remove the script; Checkout caches DOM state.
    }
  }, [])

  function validateForm(): string | null {
    if (name.trim().length < 2) return 'Please share your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "That email doesn't look right."
    if (phone.replace(/\D/g, '').length < 7) {
      return 'A valid phone number lets us reach out about onboarding.'
    }
    return null
  }

  async function runFreeEnrol(appliedCode: string) {
    try {
      const res = await enrollFree({
        cohortId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        goal,
        code: appliedCode,
      })
      if (!res.ok) {
        setError(enrollFreeErrorCopy(res.error))
        return
      }
      setPaid(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete enrolment.')
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const v = validateForm()
    if (v) {
      setError(v)
      return
    }

    // 100%-off discount → skip Razorpay entirely, enrol directly.
    if (applied?.isFree) {
      startTransition(() => runFreeEnrol(applied.code))
      return
    }

    if (!window.Razorpay) {
      setError('Payment library is still loading — try again in a moment.')
      return
    }

    startTransition(async () => {
      try {
        const order = await createOrder({
          cohortId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          goal,
        })
        if (!order.keyId) {
          throw new Error('Payments not configured — set NEXT_PUBLIC_RAZORPAY_KEY_ID in .env.')
        }
        if (!window.Razorpay) {
          throw new Error('Razorpay Checkout failed to load.')
        }
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amountMinor,
          currency: order.currency,
          name: 'Superaccountant',
          description: cohortName,
          order_id: order.orderId,
          prefill: { name: name.trim(), email: email.trim(), contact: phone.trim() },
          theme: { color: '#7c3aed' },
          modal: {
            ondismiss: () => {
              setError('Payment cancelled — you can retry any time.')
            },
            escape: true,
          },
          handler: async (resp) => {
            try {
              const result = await verifyPayment({
                razorpayOrderId: resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
              })
              if (!result.ok) {
                setError(
                  `Payment received but verification failed (${result.error}). Our team will contact you within 24 hours.`,
                )
                return
              }
              setPaid(true)
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : 'Verification call failed — please contact support.',
              )
            }
          },
        })
        rzp.open()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start payment.')
      }
    })
  }

  if (paid) {
    return (
      <div className="rounded-2xl border-2 border-success/40 bg-success/5 p-8 text-center sm:p-12">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-success/40 bg-success/10">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          You're in, {name.split(' ')[0]}.
        </h3>
        <p className="mt-3 text-base text-fg-muted">
          Payment received. Your seat in <strong className="text-fg">{cohortName}</strong> is
          confirmed. Our team will WhatsApp you on <strong>{phone}</strong> within 24 hours with the
          onboarding kit, classroom location, and prep checklist.
        </p>
        <p className="mt-3 text-xs text-fg-subtle">
          A receipt has been emailed to <strong>{email}</strong>.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border-2 border-accent/40 bg-accent-soft/30 p-6 sm:p-8"
    >
      <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
        <ShieldCheck className="h-3 w-3" />
        Secure payment via Razorpay
      </div>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Reserve your seat</h3>

      <div className="mt-4 flex items-baseline gap-3">
        <span className="text-4xl font-bold tracking-tight text-fg sm:text-5xl">
          {applied?.isFree ? 'FREE' : effectivePriceLabel}
        </span>
        <span className="text-lg text-fg-subtle line-through">
          {applied ? priceLabel : originalPriceLabel}
        </span>
        {discountPct > 0 && (
          <span className="rounded-md bg-success/15 px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-success">
            {discountPct}% OFF
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-fg-muted">
        {applied?.isFree
          ? 'Discount applied — no payment needed. Your seat will be reserved instantly.'
          : 'One-time fee · UPI / cards / netbanking / wallets · No hidden costs'}
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
            placeholder={currency === 'INR' ? '+91 98xxx xxxxx' : '+966 5x xxx xxxx'}
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

      <div className="mt-6">
        <DiscountCodeInput
          cohortId={cohortId}
          applied={applied}
          onApply={setApplied}
          onClear={() => setApplied(null)}
          applyDiscountCode={applyDiscountCode}
        />
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
            {applied?.isFree ? 'Reserving your seat…' : 'Opening payment…'}
          </>
        ) : applied?.isFree ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Reserve seat — Free
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            Pay {effectivePriceLabel} & reserve seat
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </>
        )}
      </button>

      <p className="mt-3 text-[11px] text-fg-subtle">
        100% refund within 7 days if you change your mind. After that, no questions — but if the
        cohort doesn't run, you get your full fee back.
      </p>
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

function formatMinor(minor: number, currency: 'INR' | 'SAR'): string {
  const major = minor / 100
  if (currency === 'INR') {
    return `₹${major.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  }
  return `SAR ${major.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function enrollFreeErrorCopy(error: string): string {
  switch (error) {
    case 'invalid_code':
      return "Your code couldn't be confirmed at checkout — please re-apply it."
    case 'code_exhausted':
      return 'That code has just been used up. Please reach out for help.'
    case 'invalid_name':
    case 'invalid_email':
    case 'invalid_phone':
      return 'Please double-check your details.'
    default:
      return 'Could not complete enrolment — please try again or contact support.'
  }
}
