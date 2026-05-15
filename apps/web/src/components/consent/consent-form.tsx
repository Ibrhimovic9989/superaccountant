'use client'

import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

/**
 * Consent checkboxes for the post-signup compliance gate. All four
 * boxes must be ticked before the Agree button activates — DPDP /
 * Razorpay both prefer affirmative opt-in over a single 'I agree'
 * blanket statement.
 *
 * The server action returns ok=true once the consent row is written,
 * then we router.push to the next step of the welcome flow.
 */
type Props = {
  locale: 'en' | 'ar'
  termsHref: string
  refundHref: string
  nextHref: string
  submitConsent: () => Promise<{ ok: true } | { ok: false; error: string }>
}

const COPY = {
  en: {
    terms: 'I have read and agree to the',
    termsLink: 'Terms & Conditions',
    refund: 'I have read and agree to the',
    refundLink: 'Refund & Cancellation Policy',
    data: 'I consent to my data being processed for cohort enrolment, AI tutor personalisation, and certificate verification.',
    age: 'I am at least 18 years old (or 16+ with verifiable parental consent).',
    agree: 'I agree — take me in',
    saving: 'Saving…',
    serverError: 'Something went wrong — please retry or contact info@superaccountant.in',
  },
  ar: {
    terms: 'لقد قرأت ووافقت على',
    termsLink: 'الشروط والأحكام',
    refund: 'لقد قرأت ووافقت على',
    refundLink: 'سياسة الاسترداد والإلغاء',
    data: 'أوافق على معالجة بياناتي لأغراض التسجيل في الدفعة والتخصيص الذكي للمدرس والتحقق من الشهادة.',
    age: 'عمري ١٨ سنة على الأقل (أو ١٦+ بموافقة ولي أمر قابلة للتحقق).',
    agree: 'أوافق — ابدأ',
    saving: 'جاري الحفظ…',
    serverError: 'حدث خطأ ما — حاول مجددًا أو راسل info@superaccountant.in',
  },
} as const

type Key = 'terms' | 'refund' | 'data' | 'age'

export function ConsentForm({ locale, termsHref, refundHref, nextHref, submitConsent }: Props) {
  const router = useRouter()
  const t = COPY[locale]
  const [checks, setChecks] = useState<Record<Key, boolean>>({
    terms: false,
    refund: false,
    data: false,
    age: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const allChecked = checks.terms && checks.refund && checks.data && checks.age

  function toggle(k: Key) {
    setChecks((prev) => ({ ...prev, [k]: !prev[k] }))
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!allChecked) return
    startTransition(async () => {
      try {
        const res = await submitConsent()
        if (!res.ok) {
          setError(t.serverError)
          return
        }
        router.push(nextHref)
      } catch (err) {
        setError(err instanceof Error ? err.message : t.serverError)
      }
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border-2 border-border bg-bg-elev/60 p-6 backdrop-blur sm:p-8"
    >
      <ul className="space-y-3">
        <CheckRow checked={checks.terms} onChange={() => toggle('terms')}>
          {t.terms}{' '}
          <a
            href={termsHref}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            {t.termsLink}
          </a>
          .
        </CheckRow>

        <CheckRow checked={checks.refund} onChange={() => toggle('refund')}>
          {t.refund}{' '}
          <a
            href={refundHref}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            {t.refundLink}
          </a>
          .
        </CheckRow>

        <CheckRow checked={checks.data} onChange={() => toggle('data')}>
          {t.data}
        </CheckRow>

        <CheckRow checked={checks.age} onChange={() => toggle('age')}>
          {t.age}
        </CheckRow>
      </ul>

      {error && (
        <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!allChecked || pending}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-7 py-4 text-base font-medium text-bg shadow-[0_0_0_1px_rgba(167,139,250,0.3),0_8px_24px_-12px_rgba(139,92,246,0.55)] transition-all hover:shadow-[0_0_0_1px_rgba(167,139,250,0.5),0_12px_32px_-12px_rgba(139,92,246,0.75)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:w-auto"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.saving}
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            {t.agree}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </>
        )}
      </button>
    </form>
  )
}

function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: () => void
  children: React.ReactNode
}) {
  return (
    <li>
      <label className="group flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-bg p-3 transition-all hover:border-border-strong has-[:checked]:border-accent/50 has-[:checked]:bg-accent-soft/30">
        <span className="relative mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="peer absolute inset-0 cursor-pointer opacity-0"
          />
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-border bg-bg-elev transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-bg">
            {checked && <Check className="h-3 w-3" strokeWidth={3} />}
          </span>
        </span>
        <span className="text-sm leading-relaxed text-fg">{children}</span>
      </label>
    </li>
  )
}
