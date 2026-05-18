'use client'

import { BorderBeam } from '@/components/magicui/border-beam'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

/**
 * Pay-balance flow for the second installment. Mirrors the apply-and-pay
 * Razorpay handshake: createOrder → open Checkout → verifyPayment.
 *
 * Single call-site: the /pay-balance page renders this when the signed-in
 * user has an application with paidAmountMinor < totalAmountMinor.
 */

type CreateBalanceOrderResponse = {
  orderId: string
  amountMinor: number
  currency: string
  keyId: string
}

type VerifyResponse = { ok: true } | { ok: false; error: string }

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

type Props = {
  cohortName: string
  balanceLabel: string
  paidLabel: string
  totalLabel: string
  dueLabel: string | null
  applicantName: string
  applicantEmail: string
  applicantPhone: string
  successUrl: string
  createBalanceOrder: () => Promise<CreateBalanceOrderResponse>
  verifyPayment: (input: {
    razorpayOrderId: string
    razorpayPaymentId: string
    razorpaySignature: string
  }) => Promise<VerifyResponse>
}

export function PayBalanceFlow({
  cohortName,
  balanceLabel,
  paidLabel,
  totalLabel,
  dueLabel,
  applicantName,
  applicantEmail,
  applicantPhone,
  successUrl,
  createBalanceOrder,
  verifyPayment,
}: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [paid, setPaid] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (window.Razorpay) return
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  useEffect(() => {
    if (paid) router.push(successUrl)
  }, [paid, router, successUrl])

  async function runRazorpay() {
    try {
      const order = await createBalanceOrder()
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
        description: `${cohortName} · balance`,
        order_id: order.orderId,
        prefill: { name: applicantName, email: applicantEmail, contact: applicantPhone },
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
    if (!window.Razorpay) {
      setError('Payment library is still loading — try again in a moment.')
      return
    }
    startTransition(runRazorpay)
  }

  if (paid) {
    return (
      <div className="rounded-2xl border-2 border-success/40 bg-success/5 p-8 text-center sm:p-12">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-success/40 bg-success/10">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Balance cleared — you're fully paid up.
        </h3>
        <p className="mt-3 text-base text-fg-muted">Redirecting you to your dashboard…</p>
        <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-fg-muted" />
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative overflow-hidden rounded-2xl border-2 border-accent/40 bg-accent-soft/30 p-6 sm:p-8"
    >
      <BorderBeam size={120} duration={9} colorFrom="#a78bfa" colorTo="#8b5cf6" />

      <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
        <ShieldCheck className="h-3 w-3" />
        Secure payment via Razorpay
      </div>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        Clear your installment balance
      </h3>
      <p className="mt-2 text-sm text-fg-muted">
        Cohort · <strong className="text-fg">{cohortName}</strong>
      </p>

      <div className="mt-6 flex items-baseline gap-3">
        <span className="text-4xl font-bold tracking-tight text-fg sm:text-5xl">
          {balanceLabel}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          outstanding
        </span>
      </div>

      <dl className="mt-5 grid gap-3 rounded-xl border border-border bg-bg-elev/40 p-4 sm:grid-cols-3">
        <Row label="Paid so far" value={paidLabel} />
        <Row label="Total fee" value={totalLabel} />
        <Row label="Balance due" value={balanceLabel} accent />
      </dl>

      {dueLabel && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
          <CalendarClock className="h-4 w-4" />
          Due by <strong>{dueLabel}</strong>
        </p>
      )}

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
            Opening payment…
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            Pay {balanceLabel} now
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </>
        )}
      </button>

      <p className="mt-3 text-[11px] text-fg-subtle">
        Pays in full and removes the balance reminder. Same Razorpay flow as the first installment.
      </p>
    </form>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{label}</dt>
      <dd
        className={`mt-1 text-base font-semibold tracking-tight ${accent ? 'text-accent' : 'text-fg'}`}
      >
        {value}
      </dd>
    </div>
  )
}
