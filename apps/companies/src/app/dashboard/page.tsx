import { Briefcase, CheckCircle2, Clock, Plus, ShieldX, Users } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth, signOut } from '@/lib/auth'
import { getCompanyForUser, listJobsForCompany } from '@/lib/api'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/sign-in')
  const { company } = await getCompanyForUser(session.user.id)
  if (!company) redirect('/onboarding')

  const { jobs } = await listJobsForCompany(session.user.id)

  async function doSignOut() {
    'use server'
    await signOut({ redirectTo: '/sign-in' })
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{company.name}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {company.city}, {company.country}
          </p>
        </div>
        <form action={doSignOut}>
          <button type="submit" className="text-xs text-fg-subtle hover:text-fg">
            Sign out
          </button>
        </form>
      </div>

      {/* ── Status banner ──────────────────────────────────── */}
      <div className="mt-6">
        <StatusBanner status={company.status} reason={null} />
      </div>

      {/* ── Jobs ───────────────────────────────────────────── */}
      <div className="mt-10 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
          <Briefcase className="h-3.5 w-3.5" />
          Your jobs ({jobs.length})
        </h2>
        {company.status === 'approved' && (
          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Post a job
          </Link>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {jobs.length === 0 ? (
          <p className="rounded-2xl border border-border bg-bg-elev/40 p-6 text-sm text-fg-muted">
            {company.status === 'approved'
              ? 'No jobs yet. Post your first opening.'
              : 'Once approved, you can post jobs here.'}
          </p>
        ) : (
          jobs.map((j) => (
            <div key={j.id} className="rounded-2xl border border-border bg-bg-elev/40 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold">{j.title}</h3>
                  <p className="mt-1 text-xs text-fg-muted">
                    {j.employmentType} · {j.city}, {j.country}
                    {j.remoteAllowed ? ' · Remote OK' : ''} ·{' '}
                    <span className={j.status === 'open' ? 'text-success' : 'text-fg-subtle'}>
                      {j.status}
                    </span>
                  </p>
                </div>
                <Link
                  href={`/jobs/${j.id}/applicants`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-bg-overlay"
                >
                  <Users className="h-3.5 w-3.5" />
                  Applicants
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}

function StatusBanner({ status, reason }: { status: string; reason: string | null }) {
  if (status === 'approved') {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-success">
        <CheckCircle2 className="h-3 w-3" />
        Approved · you can post jobs
      </div>
    )
  }
  if (status === 'suspended') {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 p-4">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-danger">
          <ShieldX className="h-3.5 w-3.5" />
          Suspended
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          Your company is suspended and can&apos;t post new jobs.
          {reason ? ` Reason: ${reason}` : ' Contact info@superaccountant.in.'}
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
      <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-warning">
        <Clock className="h-3.5 w-3.5" />
        Pending approval
      </p>
      <p className="mt-1 text-sm text-fg-muted">
        A SuperAccountant admin is reviewing your company. We&apos;ll email you when you&apos;re
        approved — usually within a business day.
      </p>
    </div>
  )
}
