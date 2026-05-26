'use client'

import { ArrowRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { SupportedLocale } from '@sa/i18n'

type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship'

type SubmitResult = { ok: true; jobId: string } | { ok: false; error: string }

type Props = {
  locale: SupportedLocale
  submitJob: (input: {
    title: string
    description: string
    skills: string[]
    employmentType: EmploymentType
    experienceMinYears: number | null
    experienceMaxYears: number | null
    salaryCurrency: string | null
    salaryMinMinor: number | null
    salaryMaxMinor: number | null
    remoteAllowed: boolean
    country: string
    city: string
    state: string | null
    postalCode: string | null
  }) => Promise<SubmitResult>
}

export function JobPostForm({ locale, submitJob }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [skillsRaw, setSkillsRaw] = useState('')
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full-time')
  const [experienceMin, setExperienceMin] = useState('')
  const [experienceMax, setExperienceMax] = useState('')
  const [salaryCurrency, setSalaryCurrency] = useState('')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [remoteAllowed, setRemoteAllowed] = useState(false)
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (title.trim().length < 2) {
      setError('Title is required.')
      return
    }
    if (description.trim().length < 20) {
      setError('Job description must be at least 20 characters.')
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

    const skills = skillsRaw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= 40)
      .slice(0, 30)

    startTransition(async () => {
      const res = await submitJob({
        title: title.trim(),
        description: description.trim(),
        skills,
        employmentType,
        experienceMinYears: experienceMin.trim() ? Number(experienceMin) : null,
        experienceMaxYears: experienceMax.trim() ? Number(experienceMax) : null,
        salaryCurrency: salaryCurrency.trim() ? salaryCurrency.trim().toUpperCase() : null,
        salaryMinMinor: salaryMin.trim() ? Math.round(Number(salaryMin) * 100) : null,
        salaryMaxMinor: salaryMax.trim() ? Math.round(Number(salaryMax) * 100) : null,
        remoteAllowed,
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
      <Field label="Job title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={150}
          placeholder="Junior GST Accountant"
          className={inputCls}
        />
      </Field>

      <Field label="Description (markdown OK, ≥20 chars)">
        <textarea
          rows={8}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={8000}
          placeholder="What does the role involve? Who's the ideal candidate?"
          className={`${inputCls} resize-y font-sans`}
        />
        <p className="mt-1 text-right text-xs text-fg-subtle">
          {description.length} / 8000
        </p>
      </Field>

      <Field label="Skills (comma-separated)">
        <input
          value={skillsRaw}
          onChange={(e) => setSkillsRaw(e.target.value)}
          placeholder="GST, TDS, Tally, Excel"
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Employment type">
          <select
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
            className={inputCls}
          >
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
        </Field>
        <Field label="Remote allowed?">
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={remoteAllowed}
              onChange={(e) => setRemoteAllowed(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Remote / hybrid acceptable
          </label>
        </Field>
        <Field label="Min experience (years)">
          <input
            type="number"
            min={0}
            max={50}
            value={experienceMin}
            onChange={(e) => setExperienceMin(e.target.value)}
            placeholder="0"
            className={inputCls}
          />
        </Field>
        <Field label="Max experience (years)">
          <input
            type="number"
            min={0}
            max={50}
            value={experienceMax}
            onChange={(e) => setExperienceMax(e.target.value)}
            placeholder="3"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Salary currency (ISO)">
          <input
            value={salaryCurrency}
            onChange={(e) => setSalaryCurrency(e.target.value.toUpperCase())}
            maxLength={3}
            placeholder="INR"
            className={`${inputCls} uppercase`}
          />
        </Field>
        <Field label="Salary min (per year)">
          <input
            type="number"
            min={0}
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
            placeholder="300000"
            className={inputCls}
          />
        </Field>
        <Field label="Salary max (per year)">
          <input
            type="number"
            min={0}
            value={salaryMax}
            onChange={(e) => setSalaryMax(e.target.value)}
            placeholder="500000"
            className={inputCls}
          />
        </Field>
      </div>

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
            className={inputCls}
          />
        </Field>
        <Field label="Postal code (optional)">
          <input
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            maxLength={20}
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
            Publishing…
          </>
        ) : (
          <>
            Publish job
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
    case 'title_required':
      return 'Job title is required.'
    case 'description_too_short':
      return 'Description needs to be at least 20 characters.'
    case 'not_approved':
      return "Your company isn't approved yet — can't post jobs."
    case 'not_signed_in':
      return 'You need to be signed in.'
    default:
      return 'Could not publish the job. Try again in a moment.'
  }
}
