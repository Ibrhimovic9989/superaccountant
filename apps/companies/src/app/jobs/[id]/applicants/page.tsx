import { ArrowLeft, FileText, Mail, Phone } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import {
  type ApplicationStatus,
  getCompanyForUser,
  listApplicationsForJob,
  listJobsForCompany,
  updateApplicationStatus,
} from '@/lib/api'

const STATUS_NEXT: { label: string; value: ApplicationStatus }[] = [
  { label: 'Shortlist', value: 'shortlisted' },
  { label: 'Reject', value: 'rejected' },
  { label: 'Hire', value: 'hired' },
]

export default async function ApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/sign-in')
  const { company } = await getCompanyForUser(session.user.id)
  if (!company) redirect('/onboarding')

  // Ownership check — the job must belong to this user's company.
  const { jobs } = await listJobsForCompany(session.user.id)
  const job = jobs.find((j) => j.id === id)
  if (!job) redirect('/dashboard')

  const { applications } = await listApplicationsForJob(id)

  async function setStatus(formData: FormData) {
    'use server'
    const applicationId = String(formData.get('applicationId') ?? '')
    const nextStatus = String(formData.get('nextStatus') ?? '') as ApplicationStatus
    if (!applicationId || !nextStatus) return
    // Re-verify ownership server-side before mutating.
    const s = await auth()
    if (!s?.user?.id) return
    const mine = await listJobsForCompany(s.user.id)
    if (!mine.jobs.some((j) => j.id === id)) return
    await updateApplicationStatus({ applicationId, nextStatus })
    revalidatePath(`/jobs/${id}/applicants`)
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
      <p className="mt-1 text-sm text-fg-muted">
        {applications.length} applicant{applications.length === 1 ? '' : 's'}
      </p>

      <div className="mt-8 space-y-4">
        {applications.length === 0 ? (
          <p className="rounded-2xl border border-border bg-bg-elev/40 p-6 text-sm text-fg-muted">
            No applicants yet.
          </p>
        ) : (
          applications.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-bg-elev/40 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold">{a.candidateName}</h3>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
                    <a href={`mailto:${a.candidateEmail}`} className="inline-flex items-center gap-1 hover:text-fg">
                      <Mail className="h-3 w-3" />
                      {a.candidateEmail}
                    </a>
                    {a.candidatePhone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {a.candidatePhone}
                      </span>
                    )}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusColor(a.status)}`}
                >
                  {a.status}
                </span>
              </div>

              {/* Candidate signals — the SuperAccountant differentiator */}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-md border border-success/30 bg-success/10 px-2 py-1 text-success">
                  Grand test: {a.candidateGrandTestScore !== null ? `${Math.round(a.candidateGrandTestScore * 100)}%` : '—'}
                </span>
                <span className="rounded-md border border-accent/30 bg-accent-soft px-2 py-1 text-accent">
                  Cohort phase: {a.candidateCohortPhase && a.candidateCohortPhase > 0 ? a.candidateCohortPhase : 'In progress'}
                </span>
              </div>

              {a.coverLetter && (
                <p className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-bg-overlay/50 p-3 text-sm text-fg-muted">
                  {a.coverLetter}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a
                  href={a.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-bg-overlay"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {a.resumeFilename ?? 'Resume'}
                </a>
                {STATUS_NEXT.filter((s) => s.value !== a.status).map((s) => (
                  <form key={s.value} action={setStatus}>
                    <input type="hidden" name="applicationId" value={a.id} />
                    <input type="hidden" name="nextStatus" value={s.value} />
                    <button
                      type="submit"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-bg-overlay"
                    >
                      {s.label}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}

function statusColor(status: ApplicationStatus): string {
  switch (status) {
    case 'hired':
      return 'border-success/40 bg-success/10 text-success'
    case 'shortlisted':
      return 'border-accent/40 bg-accent-soft text-accent'
    case 'rejected':
      return 'border-danger/40 bg-danger/10 text-danger'
    default:
      return 'border-border bg-bg-overlay text-fg-muted'
  }
}
