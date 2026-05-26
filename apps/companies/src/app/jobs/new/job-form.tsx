'use client'

import { Loader2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { EmploymentType } from '@/lib/api'

type Result = { ok: true } | { ok: false; error: string }

export function JobForm({
  defaultCountry,
  defaultCity,
  submit,
}: {
  defaultCountry: string
  defaultCity: string
  submit: (input: {
    title: string
    description: string
    skills: string[]
    employmentType: EmploymentType
    experienceMinYears: number | null
    experienceMaxYears: number | null
    remoteAllowed: boolean
    country: string
    city: string
    state: string | null
    postalCode: string | null
  }) => Promise<Result>
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [skills, setSkills] = useState('')
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full-time')
  const [expMin, setExpMin] = useState('')
  const [expMax, setExpMax] = useState('')
  const [remote, setRemote] = useState(false)
  const [country, setCountry] = useState(defaultCountry)
  const [city, setCity] = useState(defaultCity)
  const [stateRegion, setStateRegion] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (title.trim().length < 2) return setError('Job title is required.')
    if (description.trim().length < 20) return setError('Add a fuller description (20+ chars).')
    if (country.trim().length !== 2) return setError('Country must be a 2-letter ISO code.')
    if (city.trim().length < 1) return setError('City is required.')
    start(async () => {
      const res = await submit({
        title: title.trim(),
        description: description.trim(),
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30),
        employmentType,
        experienceMinYears: expMin ? Number(expMin) : null,
        experienceMaxYears: expMax ? Number(expMax) : null,
        remoteAllowed: remote,
        country: country.trim().toUpperCase(),
        city: city.trim(),
        state: stateRegion.trim() || null,
        postalCode: postalCode.trim() || null,
      })
      if (!res.ok) return setError(errorCopy(res.error))
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Job title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="Junior GST Accountant" className={input} />
      </Field>
      <Field label="Description">
        <textarea rows={8} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={8000} placeholder="Responsibilities, requirements, what a day looks like…" className={`${input} resize-y`} />
      </Field>
      <Field label="Skills (comma-separated)">
        <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="GST, TDS, Tally, Excel" className={input} />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Employment type">
          <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value as EmploymentType)} className={input}>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
        </Field>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} className="h-4 w-4 accent-accent" />
          Remote allowed
        </label>
        <Field label="Min experience (yrs, optional)">
          <input type="number" min={0} max={50} value={expMin} onChange={(e) => setExpMin(e.target.value)} className={input} />
        </Field>
        <Field label="Max experience (yrs, optional)">
          <input type="number" min={0} max={50} value={expMax} onChange={(e) => setExpMax(e.target.value)} className={input} />
        </Field>
        <Field label="Country (ISO 2-letter)">
          <input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={2} className={`${input} uppercase`} />
        </Field>
        <Field label="City">
          <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} className={input} />
        </Field>
        <Field label="State / region (optional)">
          <input value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} maxLength={80} className={input} />
        </Field>
        <Field label="Postal code (optional)">
          <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} maxLength={20} className={input} />
        </Field>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-base font-medium text-accent-fg hover:bg-accent/90 disabled:opacity-60">
        {pending ? (<><Loader2 className="h-4 w-4 animate-spin" /> Posting…</>) : (<><Plus className="h-4 w-4" /> Post job</>)}
      </button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-fg-muted">{label}</span>
      {children}
    </label>
  )
}

const input =
  'block w-full rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent'

function errorCopy(code: string): string {
  switch (code) {
    case 'not_approved':
      return 'Your company isn\'t approved yet.'
    case 'not_signed_in':
      return 'You need to be signed in.'
    default:
      return 'Could not post the job. Try again in a moment.'
  }
}
