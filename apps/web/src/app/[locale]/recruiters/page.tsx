import { BadgeCheck, ExternalLink, Filter, GraduationCap, Search } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { AppNav } from '@/components/app-nav'
import { PageBackdrop } from '@/components/page-backdrop'
import { auth } from '@/lib/auth'
import { isApprovedRecruiter, listGraduates } from '@/lib/community/recruiter-store'
import { RecruiterApplyForm } from '@/components/community/recruiter-apply-form'

export const metadata: Metadata = {
  title: 'Hire from SuperAccountant · Verified accounting talent',
  description:
    'Verified accountants from the SuperAccountant Community — India + KSA. Filter by market, mastery, cohort completion. Every claim is DB-backed by SuperAccountant, not self-reported.',
  robots: { index: true, follow: true },
}

type PageParams = { locale: 'en' | 'ar' }
type SearchParams = {
  market?: 'india' | 'ksa'
  min?: string
  passed?: string
  cohort?: string
}

export const dynamic = 'force-dynamic'

export default async function RecruitersPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>
  searchParams: Promise<SearchParams>
}) {
  const { locale } = await params
  const sp = await searchParams
  const session = await auth()
  const approved = await isApprovedRecruiter(session?.user?.id ?? null)

  if (!approved) {
    return <RecruiterGate locale={locale} signedIn={!!session?.user} />
  }

  const minMastery = sp.min ? Number(sp.min) : null
  const filters = {
    market: sp.market ?? null,
    minMastery: Number.isFinite(minMastery) ? minMastery : null,
    passedGrandTest: sp.passed === '1' ? true : null,
    cohortCompleted: sp.cohort === '1' ? true : null,
  }
  const candidates = await listGraduates(filters, 60)

  return (
    <div className="relative min-h-screen bg-bg text-fg">
      <PageBackdrop />
      <AppNav
        locale={locale}
        userName={session?.user?.name ?? null}
        userEmail={session?.user?.email ?? ''}
      />

      <main className="relative mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
            Recruiters
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Verified accounting talent
          </h1>
          <p className="mt-2 max-w-xl text-sm text-fg-muted">
            Every candidate below has completed at least one SuperAccountant milestone — grand
            test, cohort, or certificate. The badges are DB-verified, not self-reported.
          </p>
        </header>

        <FilterBar locale={locale} filters={filters} />

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {candidates.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-bg-elev p-8 text-center">
              <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                No candidates match those filters
              </p>
              <p className="mt-2 text-sm text-fg-muted">
                Loosen your criteria —{' '}
                <Link href={`/${locale}/recruiters`} className="text-accent hover:underline">
                  view all graduates
                </Link>
                .
              </p>
            </div>
          )}
          {candidates.map((c) => (
            <CandidateCard key={c.userId} c={c} locale={locale} />
          ))}
        </div>
      </main>
    </div>
  )
}

function FilterBar({
  locale,
  filters,
}: {
  locale: 'en' | 'ar'
  filters: {
    market: 'india' | 'ksa' | null
    minMastery: number | null
    passedGrandTest: boolean | null
    cohortCompleted: boolean | null
  }
}) {
  const chips = [
    {
      href: `/${locale}/recruiters`,
      active: !filters.market && !filters.minMastery && !filters.passedGrandTest && !filters.cohortCompleted,
      label: 'All',
    },
    {
      href: `/${locale}/recruiters?market=india`,
      active: filters.market === 'india',
      label: 'India',
    },
    {
      href: `/${locale}/recruiters?market=ksa`,
      active: filters.market === 'ksa',
      label: 'KSA',
    },
    {
      href: `/${locale}/recruiters?passed=1`,
      active: filters.passedGrandTest === true,
      label: 'Passed grand test',
    },
    {
      href: `/${locale}/recruiters?cohort=1`,
      active: filters.cohortCompleted === true,
      label: 'Cohort complete',
    },
    {
      href: `/${locale}/recruiters?min=0.75`,
      active: filters.minMastery === 0.75,
      label: 'Mastery ≥ 75%',
    },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
      <Filter className="h-3 w-3 text-fg-subtle" />
      {chips.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          className={
            c.active
              ? 'rounded-full border border-accent bg-accent/10 px-3 py-1 text-accent'
              : 'rounded-full border border-border bg-bg-elev px-3 py-1 text-fg-muted hover:border-border-strong hover:text-fg'
          }
        >
          {c.label}
        </Link>
      ))}
    </div>
  )
}

function CandidateCard({
  c,
  locale,
}: {
  c: Awaited<ReturnType<typeof listGraduates>>[number]
  locale: 'en' | 'ar'
}) {
  const initials = (c.name || c.handle)
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-bg-elev p-5 transition-colors hover:border-border-strong">
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-bg-overlay text-lg font-semibold">
          {c.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>{initials || <GraduationCap className="h-6 w-6 text-fg-subtle" />}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-semibold">{c.name ?? c.handle}</p>
            <BadgeCheck className="h-4 w-4 text-accent" aria-label="Verified by SuperAccountant" />
          </div>
          <p className="font-mono text-[11px] text-fg-subtle">@{c.handle}</p>
          {c.headline && (
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
              {c.headline}
            </p>
          )}
        </div>
      </div>

      {c.bio && <p className="mt-3 line-clamp-2 text-sm text-fg-muted">{c.bio}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {c.hasCertificate && (
          <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-blue-300">
            Certified
          </span>
        )}
        {c.passedGrandTest && (
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300">
            Grand test
          </span>
        )}
        {c.cohortCompleted && (
          <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-orange-300">
            Cohort
          </span>
        )}
        {c.bestGrandTestScore != null && (
          <span className="rounded-full border border-border bg-bg-overlay px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            {Math.round(c.bestGrandTestScore * 100)}% mastery
          </span>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {c.postCount} posts · {c.followerCount} followers
        </span>
        <Link
          href={`/${locale}/u/${c.handle}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:opacity-80"
        >
          View profile
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </article>
  )
}

function RecruiterGate({ locale, signedIn }: { locale: 'en' | 'ar'; signedIn: boolean }) {
  return (
    <div className="relative min-h-screen bg-bg text-fg">
      <PageBackdrop />
      <main className="mx-auto max-w-lg px-6 py-16">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-accent/40 bg-accent/10 text-accent">
            <Search className="h-5 w-5" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
            Recruiter portal
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Hire from SuperAccountant
          </h1>
          <p className="mt-3 text-sm text-fg-muted">
            Access the verified graduate directory. Every candidate's badges are DB-backed by
            SuperAccountant, not self-reported. Approvals take under 24 hours.
          </p>
        </div>
        {signedIn ? (
          <RecruiterApplyForm />
        ) : (
          <div className="rounded-2xl border border-border bg-bg-elev p-6 text-center">
            <p className="text-sm text-fg-muted">
              Sign in with your work email to request access.
            </p>
            <Link
              href={`/${locale}/sign-in`}
              className="mt-4 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
            >
              Sign in
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
