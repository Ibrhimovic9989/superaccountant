import {
  Briefcase,
  CheckCircle2,
  Clock,
  Eye,
  PlusCircle,
  ShieldX,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { SupportedLocale } from '@sa/i18n'
import { Logo } from '@/components/brand/logo'
import { auth } from '@/lib/auth'
import { getCompanyForUser, listJobsForCompany } from '@/lib/careers/store'

/**
 * Company dashboard. Branches on company.status:
 *   - pending_approval → "we're reviewing" banner, no post-job CTA
 *   - approved         → post-new-job button + jobs list
 *   - suspended        → suspended banner with reason, no post button
 *
 * The job list shows per-row applicant counts so HR can drill into
 * each posting's pipeline.
 */
export default async function CompanyDashboardPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) {
    redirect(
      `/${locale}/sign-in?callbackUrl=${encodeURIComponent(
        `/${locale}/companies/dashboard`,
      )}`,
    )
  }
  const company = await getCompanyForUser(session.user.id)
  if (!company) redirect(`/${locale}/companies/onboarding`)

  const jobs = await listJobsForCompany(company.id)
  const applicantCounts = await getApplicantCountsForJobs(jobs.map((j) => j.id))

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border bg-bg-elev/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2">
            <Logo size="sm" />
          </Link>
          <span className="text-xs text-fg-muted">{session.user.email}</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {company.name}
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          {[company.city, company.state, company.country].filter(Boolean).join(', ')}
        </p>

        {/* ── Status banner ──────────────────────────────────── */}
        <StatusBanner company={company} />

        {/* ── Post a job ─────────────────────────────────────── */}
        {company.status === 'approved' && (
          <div className="mt-6">
            <Link
              href={`/${locale}/companies/jobs/new`}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-base font-medium text-bg hover:bg-accent/90"
            >
              <PlusCircle className="h-4 w-4" />
              Post a new job
            </Link>
          </div>
        )}

        {/* ── Jobs list ──────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
            <Briefcase className="h-3.5 w-3.5" />
            Your jobs ({jobs.length})
          </h2>
          {jobs.length === 0 ? (
            <p className="rounded-2xl border border-border bg-bg-elev/40 p-6 text-sm text-fg-muted">
              {company.status === 'approved'
                ? 'No jobs yet. Click "Post a new job" above to get started.'
                : 'Once approved, you can post jobs here.'}
            </p>
          ) : (
            <div className="space-y-3">
              {jobs.map((j) => (
                <Link
                  key={j.id}
                  href={`/${locale}/companies/jobs/${j.id}/applicants`}
                  className="block rounded-2xl border border-border bg-bg-elev/40 p-5 transition-colors hover:border-accent/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold">{j.title}</h3>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
                        <span>{j.employmentType}</span>
                        <span>·</span>
                        <span>
                          {j.city}, {j.country}
                        </span>
                        <span>·</span>
                        <span className={statusClass(j.status)}>{j.status}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-2xl font-semibold tabular-nums">
                        {applicantCounts[j.id] ?? 0}
                      </p>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
                        <Users className="me-1 inline h-3 w-3" />
                        applicants
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

async function getApplicantCountsForJobs(jobIds: string[]): Promise<Record<string, number>> {
  if (jobIds.length === 0) return {}
  const { prisma } = await import('@sa/db')
  const rows = await prisma.$queryRaw<Array<{ jobId: string; n: bigint }>>`
    SELECT "jobId", COUNT(*) AS "n"
    FROM "JobApplication"
    WHERE "jobId" = ANY(${jobIds}::text[])
    GROUP BY "jobId"
  `
  const out: Record<string, number> = {}
  for (const r of rows) out[r.jobId] = Number(r.n)
  return out
}

function StatusBanner({
  company,
}: {
  company: Awaited<ReturnType<typeof getCompanyForUser>>
}) {
  if (!company) return null
  if (company.status === 'pending_approval') {
    return (
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <p className="text-sm font-semibold text-fg">Pending approval</p>
          <p className="mt-1 text-xs text-fg-muted">
            We&apos;re reviewing your company. You&apos;ll be able to post jobs once approved
            — usually within a business day.
          </p>
        </div>
      </div>
    )
  }
  if (company.status === 'approved') {
    return (
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-success/30 bg-success/5 p-4">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <div>
          <p className="text-sm font-semibold text-fg">Approved</p>
          <p className="mt-1 text-xs text-fg-muted">
            You can post jobs that&apos;ll appear on the public board.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-4">
      <ShieldX className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
      <div>
        <p className="text-sm font-semibold text-danger">Suspended</p>
        <p className="mt-1 text-xs text-fg-muted">
          Your company is suspended. New jobs can&apos;t be posted until reinstated.
          {company.suspendReason && (
            <>
              {' '}Reason: <em>{company.suspendReason}</em>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

function statusClass(status: string): string {
  switch (status) {
    case 'open':
      return 'text-success'
    case 'closed':
      return 'text-fg-subtle'
    case 'filled':
      return 'text-accent'
    default:
      return 'text-fg-muted'
  }
}
