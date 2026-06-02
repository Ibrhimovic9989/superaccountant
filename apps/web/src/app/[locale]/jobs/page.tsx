import { Logo } from '@/components/brand/logo'
import { type EmploymentType, listPublicJobs } from '@/lib/careers/store'
import { buildPublicMetadata } from '@/lib/seo/public-metadata'
import type { SupportedLocale } from '@sa/i18n'
import { Briefcase, Building2, MapPin, Wifi } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}): Promise<Metadata> {
  const { locale } = await params
  return buildPublicMetadata({
    locale,
    path: '/jobs',
    title: 'Accounting jobs — vetted candidates, verified employers',
    description:
      'Browse openings for accountants from verified companies in India and KSA. Apply with one click as a SuperAccountant cohort graduate.',
  })
}

/**
 * Public job board. Anyone can browse — no auth required. Apply is
 * gated separately at /jobs/[id]/apply (must be enrolled + grand-test
 * passed; the apply route handles the gate).
 *
 * Filters: country, employmentType, remoteOnly. Stateless URL — every
 * filter is a query param so the page is SSR-friendly + shareable.
 */
export default async function JobsBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: SupportedLocale }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const q = await searchParams
  const country = typeof q.country === 'string' ? q.country.toUpperCase() : undefined
  const employmentTypeRaw = typeof q.type === 'string' ? q.type : undefined
  const employmentType =
    employmentTypeRaw &&
    ['full-time', 'part-time', 'contract', 'internship'].includes(employmentTypeRaw)
      ? (employmentTypeRaw as EmploymentType)
      : undefined
  const remoteOnly = q.remote === '1'

  const jobs = await listPublicJobs({ country, employmentType, remoteOnly, limit: 100 })

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border bg-bg-elev/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2">
            <Logo size="sm" />
          </Link>
          <Link
            href={`/${locale}/cohort`}
            className="text-sm font-medium text-fg-muted hover:text-fg"
          >
            Join the cohort →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          <Briefcase className="h-3 w-3 text-accent" />
          Jobs board
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Built for accountants. Listed by employers.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-fg-muted">
          Browse openings from verified companies. Apply with one click — only available to
          SuperAccountant cohort grads who&apos;ve cleared the grand test.
        </p>

        {/* ── Filters ────────────────────────────────────────── */}
        <form
          method="GET"
          className="mt-8 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-bg-elev/40 p-4"
        >
          <div>
            <label
              htmlFor="country"
              className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg-subtle"
            >
              Country
            </label>
            <input
              type="text"
              id="country"
              name="country"
              defaultValue={country ?? ''}
              maxLength={2}
              placeholder="IN"
              className="rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm uppercase outline-none focus:border-accent"
            />
          </div>
          <div>
            <label
              htmlFor="type"
              className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg-subtle"
            >
              Type
            </label>
            <select
              id="type"
              name="type"
              defaultValue={employmentType ?? ''}
              className="rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="">Any</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="remote"
              value="1"
              defaultChecked={remoteOnly}
              className="h-4 w-4 accent-accent"
            />
            Remote only
          </label>
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent/90"
          >
            Filter
          </button>
          <Link href={`/${locale}/jobs`} className="text-xs text-fg-subtle hover:text-fg">
            Clear
          </Link>
        </form>

        {/* ── Listings ───────────────────────────────────────── */}
        <div className="mt-8 space-y-3">
          {jobs.length === 0 ? (
            <div className="rounded-2xl border border-border bg-bg-elev/40 p-8 text-center text-sm text-fg-muted">
              No jobs match these filters. Try clearing them.
            </div>
          ) : (
            jobs.map((j) => (
              <Link
                key={j.id}
                href={`/${locale}/jobs/${j.id}`}
                className="block rounded-2xl border border-border bg-bg-elev/40 p-5 transition-colors hover:border-accent/50 hover:bg-accent-soft/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold tracking-tight">{j.title}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {j.companyName}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {j.city}, {j.country}
                      </span>
                      {j.remoteAllowed && (
                        <span className="inline-flex items-center gap-1 text-success">
                          <Wifi className="h-3.5 w-3.5" />
                          Remote OK
                        </span>
                      )}
                    </p>
                    {j.skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {j.skills.slice(0, 5).map((s) => (
                          <span
                            key={s}
                            className="rounded-full border border-border bg-bg-overlay px-2 py-0.5 text-[11px] text-fg-muted"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                    {j.employmentType}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
