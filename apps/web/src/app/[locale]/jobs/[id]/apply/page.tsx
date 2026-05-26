import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { SupportedLocale } from '@sa/i18n'
import { Logo } from '@/components/brand/logo'
import { ApplyForm } from '@/components/jobs/apply-form'
import { auth } from '@/lib/auth'
import {
  checkApplyEligibility,
  getJobWithCompany,
  hasUserAppliedToJob,
  submitApplication,
} from '@/lib/careers/store'
import { uploadResumePdf } from '@/lib/storage/resumes'

/**
 * Gated apply page. Redirects out if the user can't apply:
 *   - not signed in → /sign-in?callbackUrl=<here>
 *   - not enrolled / not passed grand test → back to the job detail
 *     (where the inline CTAs explain the path forward)
 *   - already applied → back to the job detail
 *
 * If the gate passes, renders the apply form whose action runs
 * uploadAndSubmit() server-side: upload resume to Supabase Storage,
 * persist the JobApplication row, snapshot the candidate's grand-test
 * score + cohort phase. On success → /jobs/[id]?applied=1.
 */
export default async function ApplyPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale; id: string }>
}) {
  const { locale, id } = await params
  const job = await getJobWithCompany(id)
  if (!job || job.status !== 'open') notFound()

  const session = await auth()
  if (!session?.user?.id) {
    redirect(
      `/${locale}/sign-in?callbackUrl=${encodeURIComponent(`/${locale}/jobs/${id}/apply`)}`,
    )
  }
  const userId = session.user.id

  const eligibility = await checkApplyEligibility(userId)
  if (!eligibility.eligible) redirect(`/${locale}/jobs/${id}`)

  const alreadyApplied = await hasUserAppliedToJob({ userId, jobId: id })
  if (alreadyApplied) redirect(`/${locale}/jobs/${id}?applied=1`)

  async function uploadAndSubmit(formData: FormData): Promise<{ ok: boolean; error?: string }> {
    'use server'
    try {
      const s = await auth()
      if (!s?.user?.id) return { ok: false, error: 'not_signed_in' }
      const file = formData.get('resume')
      const coverLetter = formData.get('coverLetter')
      if (!(file instanceof File)) return { ok: false, error: 'missing_resume' }
      if (file.size === 0) return { ok: false, error: 'missing_resume' }

      const upload = await uploadResumePdf({
        userId: s.user.id,
        file,
        originalFilename: file.name,
      })

      const result = await submitApplication({
        userId: s.user.id,
        jobId: id,
        resumeUrl: upload.url,
        resumeFilename: file.name,
        coverLetter: typeof coverLetter === 'string' && coverLetter.trim() ? coverLetter.trim() : null,
      })
      if (!result.ok) return { ok: false, error: result.reason }
      return { ok: true }
    } catch (err) {
      console.error('[apply] uploadAndSubmit failed', { jobId: id, err })
      return { ok: false, error: 'server_error' }
    }
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border bg-bg-elev/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2">
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <Link
          href={`/${locale}/jobs/${id}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          Back to job
        </Link>

        <h1 className="text-3xl font-semibold tracking-tight">
          Apply: {job.title}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          at {job.companyName} · {job.city}, {job.country}
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-bg-elev/40 p-6">
          <ApplyForm
            locale={locale}
            jobId={id}
            grandTestScore={eligibility.grandTestScore}
            cohortPhase={eligibility.cohortPhase}
            uploadAndSubmit={uploadAndSubmit}
          />
        </div>
      </main>
    </div>
  )
}
