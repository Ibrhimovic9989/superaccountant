import { ArrowLeft, FileText, Mail, Phone, Trophy } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { SupportedLocale } from '@sa/i18n'
import { prisma } from '@sa/db'
import { Logo } from '@/components/brand/logo'
import { auth } from '@/lib/auth'
import {
  type ApplicationStatus,
  getCompanyForUser,
  listApplicationsForJob,
} from '@/lib/careers/store'

/**
 * Applicants pipeline for one job. Authorisation:
 *   - viewer must be the owner of the company that posted the job
 *   - if the viewer isn't a CompanyMember of the job's company,
 *     respond with notFound() (don't leak existence)
 *
 * Each applicant row shows the candidate snapshot we froze at apply
 * time (grand-test score, cohort phase) and the resume link. HR can
 * shortlist / reject / hire inline.
 */
export default async function ApplicantsPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale; id: string }>
}) {
  const { locale, id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    redirect(
      `/${locale}/sign-in?callbackUrl=${encodeURIComponent(
        `/${locale}/companies/jobs/${id}/applicants`,
      )}`,
    )
  }
  const company = await getCompanyForUser(session.user.id)
  if (!company) redirect(`/${locale}/companies/onboarding`)

  // Verify the job belongs to this company before listing applicants.
  const jobRows = await prisma.$queryRaw<
    Array<{ id: string; title: string; companyId: string; status: string }>
  >`
    SELECT "id", "title", "companyId", "status"
    FROM "Job"
    WHERE "id" = ${id}
    LIMIT 1
  `
  const job = jobRows[0]
  if (!job || job.companyId !== company.id) notFound()

  const apps = await listApplicationsForJob(id)

  async function updateStatus(formData: FormData): Promise<void> {
    'use server'
    const applicationId = String(formData.get('applicationId') ?? '')
    const nextStatus = String(formData.get('nextStatus') ?? '')
    if (!applicationId) return
    if (!['submitted', 'shortlisted', 'rejected', 'hired'].includes(nextStatus)) return
    // Re-verify ownership inside the action — the form is server-rendered
    // so this is defence-in-depth.
    const s = await auth()
    if (!s?.user?.id) return
    const co = await getCompanyForUser(s.user.id)
    if (!co) return
    const owns = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT a."id"
      FROM "JobApplication" a
      JOIN "Job" j ON j."id" = a."jobId"
      WHERE a."id" = ${applicationId} AND j."companyId" = ${co.id}
      LIMIT 1
    `
    if (!owns[0]) return
    await prisma.$executeRaw`
      UPDATE "JobApplication"
      SET "status" = ${nextStatus}::text, "updatedAt" = NOW()
      WHERE "id" = ${applicationId}
    `
    revalidatePath(`/${locale}/companies/jobs/${id}/applicants`)
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border bg-bg-elev/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2">
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href={`/${locale}/companies/dashboard`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          Dashboard
        </Link>

        <h1 className="text-3xl font-semibold tracking-tight">{job.title}</h1>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          Applicants ({apps.length}) · job {job.status}
        </p>

        {apps.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-border bg-bg-elev/40 p-8 text-center text-sm text-fg-muted">
            No applicants yet. The job is visible at <code>/jobs/{job.id}</code>.
          </p>
        ) : (
          <div className="mt-8 space-y-3">
            {apps.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-border bg-bg-elev/40 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold">
                      {a.candidateName}
                    </h3>
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {a.candidateEmail}
                      </span>
                      {a.candidatePhone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {a.candidatePhone}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusPill(a.status)}`}>
                    {a.status}
                  </span>
                </div>

                {/* ── Snapshotted credentials ────────────────── */}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-success">
                    <Trophy className="h-3 w-3" />
                    Grand test: {a.candidateGrandTestScore !== null ? `${Math.round(a.candidateGrandTestScore * 100)}%` : '—'}
                  </span>
                  <span className="rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-accent">
                    Phase {a.candidateCohortPhase ?? 0}
                  </span>
                </div>

                {/* ── Resume link ────────────────────────────── */}
                <Link
                  href={a.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Resume ({a.resumeFilename ?? 'PDF'})
                </Link>

                {/* ── Cover letter ──────────────────────────── */}
                {a.coverLetter && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-fg-subtle hover:text-fg">
                      Cover note
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-bg-overlay p-3 text-sm text-fg-muted">
                      {a.coverLetter}
                    </p>
                  </details>
                )}

                {/* ── Status actions ────────────────────────── */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {(['shortlisted', 'rejected', 'hired'] as const)
                    .filter((s) => s !== a.status)
                    .map((next) => (
                      <form key={next} action={updateStatus}>
                        <input type="hidden" name="applicationId" value={a.id} />
                        <input type="hidden" name="nextStatus" value={next} />
                        <button
                          type="submit"
                          className={`rounded-lg border px-3 py-1 text-xs font-medium ${actionClass(next)}`}
                        >
                          Mark {next}
                        </button>
                      </form>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function statusPill(status: ApplicationStatus): string {
  switch (status) {
    case 'submitted':
      return 'border border-border bg-bg-elev text-fg-muted'
    case 'shortlisted':
      return 'border border-accent/30 bg-accent-soft text-accent'
    case 'rejected':
      return 'border border-danger/30 bg-danger/10 text-danger'
    case 'hired':
      return 'border border-success/30 bg-success/10 text-success'
  }
}

function actionClass(next: 'shortlisted' | 'rejected' | 'hired'): string {
  switch (next) {
    case 'shortlisted':
      return 'border-accent/40 bg-accent-soft text-accent hover:bg-accent-soft/70'
    case 'rejected':
      return 'border-danger/30 bg-danger/10 text-danger hover:bg-danger/20'
    case 'hired':
      return 'border-success/30 bg-success/10 text-success hover:bg-success/20'
  }
}
