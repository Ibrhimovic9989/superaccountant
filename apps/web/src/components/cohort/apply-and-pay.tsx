'use client'

import { ArrowRight, CheckCircle2, CreditCard, Loader2, LogIn, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import {
  type AppliedDiscount,
  type DiscountApplyResponse,
  DiscountCodeInput,
} from './discount-code-input'

/**
 * Apply-and-pay flow for a cohort. Public marketing page, gated payment.
 *
 * Public: anyone can read the page.
 * Gated:  to reserve, the user must be signed in. Their session email
 *         is the source of truth (server actions re-fetch it; the input
 *         is read-only on the client).
 *
 * Two payment paths:
 *   - Razorpay (default): createOrder → open Checkout → verifyPayment.
 *   - 100%-off discount code: skip Razorpay, enrollFree directly.
 *
 * Track selection: the user picks which cohort (Indian Chartered vs
 * Saudi Mu'tamad). Each cohort has its own price + currency.
 *
 * On success: redirect to /dashboard. No interstitial green screen —
 * the dashboard is gated and will let the user in.
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

export type CohortOption = {
  id: string
  name: string
  track: 'india' | 'ksa'
  amountMinor: number
  originalPriceMinor: number
  currency: 'INR' | 'SAR'
  priceLabel: string
  originalPriceLabel: string
}

type Props = {
  cohorts: CohortOption[]
  sessionUser: { email: string; name: string } | null
  signInUrl: string
  successUrl: string
  createOrder: (input: {
    cohortId: string
    name: string
    phone: string
    goal: string
  }) => Promise<CreateOrderResponse>
  verifyPayment: (input: {
    razorpayOrderId: string
    razorpayPaymentId: string
    razorpaySignature: string
  }) => Promise<VerifyResponse>
  applyDiscountCode: (input: {
    cohortId: string
    code: string
  }) => Promise<DiscountApplyResponse>
  enrollFree: (input: {
    cohortId: string
    name: string
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
  cohorts,
  sessionUser,
  signInUrl,
  successUrl,
  createOrder,
  verifyPayment,
  applyDiscountCode,
  enrollFree,
}: Props) {
  const router = useRouter()

  // Unauthenticated → render the sign-in CTA instead of the form.
  if (!sessionUser) {
    return <SignInGate signInUrl={signInUrl} cohorts={cohorts} />
  }

  return (
    <AuthedForm
      cohorts={cohorts}
      sessionUser={sessionUser}
      successUrl={successUrl}
      router={router}
      createOrder={createOrder}
      verifyPayment={verifyPayment}
      applyDiscountCode={applyDiscountCode}
      enrollFree={enrollFree}
    />
  )
}

function SignInGate({ signInUrl, cohorts }: { signInUrl: string; cohorts: CohortOption[] }) {
  const first = cohorts[0]
  if (!first) return null
  const cheapest = cohorts.reduce((min, c) => (c.amountMinor < min.amountMinor ? c : min), first)
  return (
    <div className="rounded-2xl border-2 border-accent/40 bg-accent-soft/30 p-6 sm:p-8">
      <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
        <ShieldCheck className="h-3 w-3" />
        Secure payment via Razorpay
      </div>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Reserve your seat</h3>
      <p className="mt-3 text-base text-fg-muted">
        Sign in to reserve a seat in your cohort. We use your account email for the receipt and to
        send onboarding materials. Both tracks unlock the same AI tutor + classroom curriculum — you
        pick which jurisdiction during sign-up.
      </p>
      <p className="mt-2 text-sm text-fg-muted">
        Prices start from <strong className="text-fg">{cheapest.priceLabel}</strong>.
      </p>
      <Link
        href={signInUrl}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-7 py-4 text-base font-medium text-bg transition-colors hover:bg-accent/90"
      >
        <LogIn className="h-4 w-4" />
        Sign in to reserve seat
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
      </Link>
      <p className="mt-3 text-[11px] text-fg-subtle">
        New here? Same flow — sign in with Google or email and you'll land back on this page.
      </p>
    </div>
  )
}

type AuthedFormProps = Omit<Props, 'signInUrl'> & {
  sessionUser: { email: string; name: string }
  router: ReturnType<typeof useRouter>
}

function AuthedForm(props: AuthedFormProps) {
  // Guard outside the hook-using body so we don't violate Rules of Hooks.
  const first = props.cohorts[0]
  if (!first) return null
  const initial = props.cohorts.find((c) => c.track === 'india') ?? first
  return <AuthedFormBody {...props} initialCohort={initial} />
}

type AuthedFormBodyProps = AuthedFormProps & { initialCohort: CohortOption }

function AuthedFormBody({
  cohorts,
  sessionUser,
  successUrl,
  router,
  createOrder,
  verifyPayment,
  applyDiscountCode,
  enrollFree,
  initialCohort,
}: AuthedFormBodyProps) {
  const [selectedId, setSelectedId] = useState(initialCohort.id)
  const cohort = cohorts.find((c) => c.id === selectedId) ?? initialCohort

  const [name, setName] = useState(sessionUser.name)
  const [phone, setPhone] = useState('')
  const [goal, setGoal] = useState<(typeof GOAL_OPTIONS)[number]['value']>('first-job')
  const [error, setError] = useState<string | null>(null)
  const [paid, setPaid] = useState(false)
  const [pending, startTransition] = useTransition()
  const [applied, setApplied] = useState<AppliedDiscount | null>(null)

  // Effective price for display + Razorpay charge amount.
  const effectiveAmountMinor = applied ? applied.finalAmountMinor : cohort.amountMinor
  const effectivePriceLabel = applied
    ? formatMinor(effectiveAmountMinor, cohort.currency)
    : cohort.priceLabel
  const discountPct = Math.round(
    ((cohort.originalPriceMinor - effectiveAmountMinor) / cohort.originalPriceMinor) * 100,
  )

  // Lazy-load Razorpay Checkout once on mount.
  useEffect(() => {
    if (window.Razorpay) return
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  // Redirect to dashboard once paid — server has already inserted the
  // CohortApplication with status='paid', so the dashboard gate will
  // recognise this user immediately.
  useEffect(() => {
    if (paid) router.push(successUrl)
  }, [paid, router, successUrl])

  // Clear any applied discount when the user switches tracks — a code
  // valid for one cohort may not be valid for another.
  function onSelectCohort(id: string) {
    if (id === selectedId) return
    setSelectedId(id)
    setApplied(null)
    setError(null)
  }

  function validateForm(): string | null {
    if (name.trim().length < 2) return 'Please share your name.'
    if (phone.replace(/\D/g, '').length < 7) {
      return 'A valid phone number lets us reach out about onboarding.'
    }
    return null
  }

  async function runFreeEnrol(appliedCode: string) {
    try {
      const res = await enrollFree({
        cohortId: cohort.id,
        name: name.trim(),
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

  async function runRazorpay() {
    try {
      const order = await createOrder({
        cohortId: cohort.id,
        name: name.trim(),
        phone: phone.trim(),
        goal,
      })
      if (!order.keyId) {
        throw new Error('Payments not configured — set NEXT_PUBLIC_RAZORPAY_KEY_ID.')
      }
      if (!window.Razorpay) {
        throw new Error('Razorpay Checkout failed to load.')
      }
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amountMinor,
        currency: order.currency,
        name: 'Superaccountant',
        description: cohort.name,
        order_id: order.orderId,
        prefill: { name: name.trim(), email: sessionUser.email, contact: phone.trim() },
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
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const v = validateForm()
    if (v) {
      setError(v)
      return
    }

    if (applied?.isFree) {
      startTransition(() => runFreeEnrol(applied.code))
      return
    }

    if (!window.Razorpay) {
      setError('Payment library is still loading — try again in a moment.')
      return
    }

    startTransition(runRazorpay)
  }

  if (paid) return <PaidRedirect firstName={name.split(' ')[0] || 'there'} />

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

      {/* Track selector */}
      {cohorts.length > 1 && (
        <fieldset className="mt-6">
          <legend className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            Pick your track
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {cohorts.map((c) => {
              const selected = c.id === selectedId
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCohort(c.id)}
                  className={`flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all ${
                    selected
                      ? c.track === 'india'
                        ? 'border-accent bg-accent-soft text-fg'
                        : 'border-success bg-success/10 text-fg'
                      : 'border-border bg-bg-elev/50 text-fg hover:border-border-strong'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden>
                      {c.track === 'india' ? '🇮🇳' : '🇸🇦'}
                    </span>
                    <span className="text-sm font-semibold tracking-tight">
                      {c.track === 'india' ? 'Indian Chartered' : "Saudi Mu'tamad"}
                    </span>
                  </div>
                  <p className="text-xs text-fg-muted">{c.name}</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-bold tracking-tight">{c.priceLabel}</span>
                    <span className="text-xs text-fg-subtle line-through">
                      {c.originalPriceLabel}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </fieldset>
      )}

      <div className="mt-6 flex items-baseline gap-3">
        <span className="text-4xl font-bold tracking-tight text-fg sm:text-5xl">
          {applied?.isFree ? 'FREE' : effectivePriceLabel}
        </span>
        <span className="text-lg text-fg-subtle line-through">
          {applied ? cohort.priceLabel : cohort.originalPriceLabel}
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
            autoComplete="name"
          />
        </Field>
        <Field label="Email (from your account)">
          <input
            type="email"
            value={sessionUser.email}
            readOnly
            tabIndex={-1}
            aria-readonly="true"
            className={`${inputCls} cursor-not-allowed opacity-70`}
          />
        </Field>
        <Field label="Phone (WhatsApp preferred)" className="sm:col-span-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={cohort.currency === 'INR' ? '+91 98xxx xxxxx' : '+966 5x xxx xxxx'}
            className={inputCls}
            autoComplete="tel"
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
          cohortId={cohort.id}
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

function PaidRedirect({ firstName }: { firstName: string }) {
  return (
    <div className="rounded-2xl border-2 border-success/40 bg-success/5 p-8 text-center sm:p-12">
      <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-success/40 bg-success/10">
        <CheckCircle2 className="h-8 w-8 text-success" />
      </div>
      <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">You're in, {firstName}.</h3>
      <p className="mt-3 text-base text-fg-muted">Redirecting you to your dashboard…</p>
      <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-fg-muted" />
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
    case 'unauthenticated':
      return 'Please sign in again to reserve your seat.'
    case 'invalid_name':
    case 'invalid_phone':
      return 'Please double-check your details.'
    case 'server_error':
      return 'Something went wrong on our side — please retry or contact us.'
    default:
      return 'Could not complete enrolment — please try again or contact support.'
  }
}
