import { ArrowLeft, Briefcase } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { SupportedLocale } from '@sa/i18n'
import { Logo } from '@/components/brand/logo'
import { JobPostForm } from '@/components/companies/job-post-form'
import { auth } from '@/lib/auth'
import { createJob, getCompanyForUser } from '@/lib/careers/store'
import { canPostJobs } from '@/lib/careers/approval'

/**
 * Post-a-new-job form. Gated to approved companies — pending or
 * suspended companies get bounced back to the dashboard.
 */
export default async function NewJobPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) {
    redirect(
      `/${locale}/sign-in?callbackUrl=${encodeURIComponent(
        `/${locale}/companies/jobs/new`,
      )}`,
    )
  }
  const company = await getCompanyForUser(session.user.id)
  if (!company) redirect(`/${locale}/companies/onboarding`)
  if (!canPostJobs(company.status)) redirect(`/${locale}/companies/dashboard`)

  async function submitJob(input: {
    title: string
    description: string
    skills: string[]
    employmentType: 'full-time' | 'part-time' | 'contract' | 'internship'
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
  }): Promise<{ ok: true; jobId: string } | { ok: false; error: string }> {
    'use server'
    try {
      const s = await auth()
      if (!s?.user?.id) return { ok: false, error: 'not_signed_in' }
      const co = await getCompanyForUser(s.user.id)
      if (!co || !canPostJobs(co.status)) return { ok: false, error: 'not_approved' }
      if (input.title.trim().length < 2) return { ok: false, error: 'title_required' }
      if (input.description.trim().length < 20) {
        return { ok: false, error: 'description_too_short' }
      }
      const job = await createJob({ companyId: co.id, ...input })
      return { ok: true, jobId: job.id }
    } catch (err) {
      console.error('[create-job] failed', { err })
      return { ok: false, error: 'server_error' }
    }
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border bg-bg-elev/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2">
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href={`/${locale}/companies/dashboard`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          Dashboard
        </Link>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-accent">
          <Briefcase className="h-3 w-3" />
          {company.name}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Post a new job
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Only cohort grads who&apos;ve cleared the grand test will be able to apply. The post is
          public on /jobs the moment you save.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-bg-elev/40 p-6">
          <JobPostForm locale={locale} submitJob={submitJob} />
        </div>
      </main>
    </div>
  )
}
