import { ArrowLeft, Briefcase, Building2, Clock, MapPin, Wifi } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { SupportedLocale } from '@sa/i18n'
import { Logo } from '@/components/brand/logo'
import { auth } from '@/lib/auth'
import { checkApplyEligibility, getJobWithCompany, hasUserAppliedToJob } from '@/lib/careers/store'

/**
 * Public job detail page. Shows the full posting + an "Apply" CTA.
 *
 * The CTA renders differently depending on:
 *   - signed-out → "Sign in to apply" (preserves return-to via callbackUrl)
 *   - signed-in + eligible + not applied → "Apply now" → /jobs/[id]/apply
 *   - already applied → disabled "Applied" pill
 *   - signed-in + not enrolled → "Join the cohort first"
 *   - signed-in + grand test not passed → "Pass the grand test to apply"
 */
export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale; id: string }>
}) {
  const { locale, id } = await params
  const job = await getJobWithCompany(id)
  if (!job) notFound()
  if (job.status !== 'open') notFound()

  const session = await auth()
  const userId = session?.user?.id ?? null

  const [eligibility, alreadyApplied] = await Promise.all([
    checkApplyEligibility(userId),
    userId ? hasUserAppliedToJob({ userId, jobId: id }) : Promise.resolve(false),
  ])

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
          href={`/${locale}/jobs`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          All jobs
        </Link>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          <Briefcase className="h-3 w-3 text-accent" />
          {job.employmentType}
          {job.remoteAllowed && (
            <>
              <span className="text-fg-subtle/60">·</span>
              <span className="inline-flex items-center gap-1 text-success">
                <Wifi className="h-3 w-3" />
                Remote OK
              </span>
            </>
          )}
        </div>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{job.title}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-4 w-4" />
            {job.companyName}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {[job.city, job.state, job.country].filter(Boolean).join(', ')}
          </span>
          {(job.experienceMinYears !== null || job.experienceMaxYears !== null) && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {formatExperience(job.experienceMinYears, job.experienceMaxYears)}
            </span>
          )}
        </p>

        {job.skills.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-1.5">
            {job.skills.map((s) => (
              <span
                key={s}
                className="rounded-full border border-border bg-bg-elev px-3 py-1 text-xs text-fg"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        <div className="mt-10 whitespace-pre-wrap text-base leading-relaxed text-fg">
          {job.description}
        </div>

        {/* ── Apply CTA ──────────────────────────────────────── */}
        <div className="mt-12 rounded-2xl border-2 border-accent/40 bg-accent-soft/30 p-6 sm:p-8">
          <ApplyCta
            locale={locale}
            jobId={id}
            userId={userId}
            alreadyApplied={alreadyApplied}
            eligibility={eligibility}
          />
        </div>
      </main>
    </div>
  )
}

function ApplyCta({
  locale,
  jobId,
  userId,
  alreadyApplied,
  eligibility,
}: {
  locale: SupportedLocale
  jobId: string
  userId: string | null
  alreadyApplied: boolean
  eligibility: Awaited<ReturnType<typeof checkApplyEligibility>>
}) {
  if (alreadyApplied) {
    return (
      <div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-success">
          Applied
        </p>
        <p className="mt-2 text-base text-fg">
          You&apos;ve already applied to this job. The company will reach out if they want to move
          forward.
        </p>
      </div>
    )
  }
  if (!userId) {
    return (
      <ApplyCtaShell title="Sign in to apply">
        <p className="text-sm text-fg-muted">
          You need a SuperAccountant account to apply. Already have one? Sign in to continue.
        </p>
        <Link
          href={`/${locale}/sign-in?callbackUrl=${encodeURIComponent(`/${locale}/jobs/${jobId}`)}`}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-bg hover:bg-accent/90"
        >
          Sign in
        </Link>
      </ApplyCtaShell>
    )
  }
  if (!eligibility.eligible && eligibility.reason === 'not_enrolled') {
    return (
      <ApplyCtaShell title="Enrol in the cohort to apply">
        <p className="text-sm text-fg-muted">
          The job board is exclusive to paid SuperAccountant cohort students. Join the cohort to
          unlock applications.
        </p>
        <Link
          href={`/${locale}/cohort`}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-bg hover:bg-accent/90"
        >
          See cohort details
        </Link>
      </ApplyCtaShell>
    )
  }
  if (!eligibility.eligible && eligibility.reason === 'grand_test_not_passed') {
    return (
      <ApplyCtaShell title="Pass the grand test to apply">
        <p className="text-sm text-fg-muted">
          Companies on the job board only see candidates who&apos;ve cleared the grand test (70%+).
          Take it once you&apos;ve worked through the curriculum.
        </p>
        <Link
          href={`/${locale}/grand-test`}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-bg hover:bg-accent/90"
        >
          Go to grand test
        </Link>
      </ApplyCtaShell>
    )
  }

  // Eligible
  return (
    <ApplyCtaShell title="Apply with your resume">
      <p className="text-sm text-fg-muted">
        Upload your resume (PDF, ≤ 10MB) and an optional cover note. The company will see your
        grand-test score and current cohort phase.
      </p>
      <Link
        href={`/${locale}/jobs/${jobId}/apply`}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-base font-medium text-bg hover:bg-accent/90"
      >
        Apply now
      </Link>
    </ApplyCtaShell>
  )
}

function ApplyCtaShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-accent">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function formatExperience(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${min}–${max} yrs experience`
  if (min !== null) return `${min}+ yrs experience`
  if (max !== null) return `Up to ${max} yrs`
  return ''
}
