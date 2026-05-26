import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { createJob, type EmploymentType, getCompanyForUser } from '@/lib/api'
import { JobForm } from './job-form'

export default async function NewJobPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/sign-in')
  const { company } = await getCompanyForUser(session.user.id)
  if (!company) redirect('/onboarding')
  // Only approved companies can post. Non-approved → back to dashboard
  // (which shows their pending/suspended banner).
  if (company.status !== 'approved') redirect('/dashboard')

  async function submit(input: {
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
  }): Promise<{ ok: true } | { ok: false; error: string }> {
    'use server'
    try {
      const s = await auth()
      if (!s?.user?.id) return { ok: false, error: 'not_signed_in' }
      await createJob({ userId: s.user.id, ...input })
      return { ok: true }
    } catch (err) {
      console.error('[companies/jobs/new] failed', { err })
      const msg = (err as Error).message ?? ''
      if (msg.includes('company_not_approved')) return { ok: false, error: 'not_approved' }
      return { ok: false, error: 'server_error' }
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Post a job</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Visible on the public board at app.superaccountant.in/jobs. Only cohort grads who&apos;ve
        cleared the grand test can apply.
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-bg-elev/40 p-6">
        <JobForm defaultCountry={company.country} defaultCity={company.city} submit={submit} />
      </div>
    </main>
  )
}
