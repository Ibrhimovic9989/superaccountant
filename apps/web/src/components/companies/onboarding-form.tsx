'use client'

import { ArrowRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { SupportedLocale } from '@sa/i18n'

type SubmitResult = { ok: true } | { ok: false; error: string }

type Props = {
  locale: SupportedLocale
  submitOnboarding: (input: {
    name: string
    websiteUrl: string | null
    about: string | null
    country: string
    city: string
    state: string | null
    postalCode: string | null
  }) => Promise<SubmitResult>
}

export function CompanyOnboardingForm({ locale, submitOnboarding }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [about, setAbout] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (name.trim().length < 2) {
      setError('Company name is required.')
      return
    }
    if (country.trim().length !== 2) {
      setError('Country must be a 2-letter ISO code (e.g. IN, SA, US).')
      return
    }
    if (city.trim().length < 1) {
      setError('City is required.')
      return
    }
    startTransition(async () => {
      const res = await submitOnboarding({
        name: name.trim(),
        websiteUrl: website.trim() || null,
        about: about.trim() || null,
        country: country.trim().toUpperCase(),
        city: city.trim(),
        state: state.trim() || null,
        postalCode: postalCode.trim() || null,
      })
      if (!res.ok) {
        setError(errorCopy(res.error))
        return
      }
      router.push(`/${locale}/companies/dashboard`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Company name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder="Acme Accounting Co."
          className={inputCls}
        />
      </Field>

      <Field label="Website (optional)">
        <input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://example.com"
          className={inputCls}
        />
      </Field>

      <Field label="About (optional)">
        <textarea
          rows={4}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          maxLength={2000}
          placeholder="What does your company do?"
          className={`${inputCls} resize-y`}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Country (ISO 2-letter)">
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            maxLength={2}
            placeholder="IN"
            className={`${inputCls} uppercase`}
          />
        </Field>
        <Field label="City">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={80}
            placeholder="Hyderabad"
            className={inputCls}
          />
        </Field>
        <Field label="State / region (optional)">
          <input
            value={state}
            onChange={(e) => setState(e.target.value)}
            maxLength={80}
            placeholder="Telangana"
            className={inputCls}
          />
        </Field>
        <Field label="Postal code (optional)">
          <input
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            maxLength={20}
            placeholder="500004"
            className={inputCls}
          />
        </Field>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-base font-medium text-bg transition-colors hover:bg-accent/90 disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            Submit for approval
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </>
        )}
      </button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        {label}
      </span>
      {children}
    </label>
  )
}

const inputCls =
  'block w-full rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent'

function errorCopy(code: string): string {
  switch (code) {
    case 'name_required':
      return 'Company name is required.'
    case 'invalid_country':
      return 'Country must be a 2-letter ISO code.'
    case 'city_required':
      return 'City is required.'
    case 'not_signed_in':
      return 'You need to be signed in.'
    default:
      return 'Could not save your company. Try again in a moment.'
  }
}
