import { AppNav } from '@/components/app-nav'
import { auth } from '@/lib/auth'
import { getAccessTier, isAdmin } from '@/lib/cohort/access'
import { listEnrolledStudents } from '@/lib/learning-curves/aggregate'
import type { SupportedLocale } from '@sa/i18n'
import { CheckCircle2, GraduationCap, Mail, Sparkles, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

/**
 * Admin-only "Learning curves" index.
 *
 * Lists every paid (CohortApplication.status='paid') student so admins
 * can drill into a per-student before/after report and hand it to a
 * recruiter. Filters by market + completion status.
 */
export default async function AdminLearningCurvesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: SupportedLocale }>
  searchParams: Promise<{ market?: string; status?: string }>
}) {
  const { locale } = await params
  const { market: rawMarket, status: rawStatus } = await searchParams
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const tier = await getAccessTier(session.user.id)
  if (!isAdmin(tier)) redirect(`/${locale}/dashboard`)

  const market: 'india' | 'ksa' | undefined =
    rawMarket === 'india' || rawMarket === 'ksa' ? rawMarket : undefined
  const status: 'in-progress' | 'completed' | undefined =
    rawStatus === 'in-progress' || rawStatus === 'completed' ? rawStatus : undefined

  const allStudents = await listEnrolledStudents(market ? { market } : {})
  const students = status
    ? allStudents.filter((s) =>
        status === 'completed' ? s.hasCompletedCohort : !s.hasCompletedCohort,
      )
    : allStudents

  return (
    <div className="min-h-screen bg-bg text-fg">
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/5 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-warning">
          <Sparkles className="h-3 w-3" />
          Admin
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Learning curves</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Per-student before / after view — entry test, phase progression, mastery, grand test.
          Generate a PDF report from any student page to hand to recruitment companies.
        </p>

        {/* ── Filters ──────────────────────────────────────── */}
        <FilterBar
          locale={locale}
          totalCount={allStudents.length}
          market={market}
          status={status}
        />

        {/* ── Students list ─────────────────────────────────── */}
        <section className="mt-8">
          {students.length === 0 ? (
            <p className="rounded-2xl border border-border bg-bg-elev/40 p-6 text-sm text-fg-muted">
              No enrolled students match these filters yet.
            </p>
          ) : (
            <div className="space-y-2">
              {students.map((s) => (
                <Link
                  key={s.userId}
                  href={`/${locale}/admin/learning-curves/${s.userId}`}
                  className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg-elev/40 px-4 py-3 transition-colors hover:border-accent/40 hover:bg-bg-elev/70"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{s.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-fg-muted">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {s.email}
                      </span>
                      {s.enrolledAt && (
                        <span className="inline-flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          Enrolled {new Date(s.enrolledAt).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                      {s.market}
                    </span>
                    {s.hasCompletedCohort ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-success">
                        <CheckCircle2 className="h-3 w-3" />
                        Complete
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent-soft/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                        <TrendingUp className="h-3 w-3" />
                        Active
                      </span>
                    )}
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

function FilterBar({
  locale,
  totalCount,
  market,
  status,
}: {
  locale: SupportedLocale
  totalCount: number
  market: 'india' | 'ksa' | undefined
  status: 'in-progress' | 'completed' | undefined
}) {
  const base = `/${locale}/admin/learning-curves`
  const buildHref = (
    nextMarket: 'india' | 'ksa' | undefined,
    nextStatus: 'in-progress' | 'completed' | undefined,
  ): string => {
    const qs: string[] = []
    if (nextMarket) qs.push(`market=${nextMarket}`)
    if (nextStatus) qs.push(`status=${nextStatus}`)
    return qs.length === 0 ? base : `${base}?${qs.join('&')}`
  }
  return (
    <div className="mt-8 flex flex-wrap items-center gap-2">
      <FilterPill href={base} active={!market && !status}>
        All ({totalCount})
      </FilterPill>
      <FilterPill href={buildHref('india', status)} active={market === 'india'}>
        India
      </FilterPill>
      <FilterPill href={buildHref('ksa', status)} active={market === 'ksa'}>
        KSA
      </FilterPill>
      <span className="mx-1 text-fg-subtle">·</span>
      <FilterPill href={buildHref(market, 'in-progress')} active={status === 'in-progress'}>
        In progress
      </FilterPill>
      <FilterPill href={buildHref(market, 'completed')} active={status === 'completed'}>
        Completed
      </FilterPill>
    </div>
  )
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'rounded-full border border-accent bg-accent-soft/30 px-3 py-1 text-xs font-medium text-accent'
          : 'rounded-full border border-border bg-bg-elev/40 px-3 py-1 text-xs text-fg-muted hover:text-fg'
      }
    >
      {children}
    </Link>
  )
}
