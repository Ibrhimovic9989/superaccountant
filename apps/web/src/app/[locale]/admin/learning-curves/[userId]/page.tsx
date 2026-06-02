import { AppNav } from '@/components/app-nav'
import { auth } from '@/lib/auth'
import { getAccessTier, isAdmin } from '@/lib/cohort/access'
import { type LearningCurve, getLearningCurve } from '@/lib/learning-curves/aggregate'
import { generateLearningCurveReport } from '@/lib/learning-curves/generate'
import type { SupportedLocale } from '@sa/i18n'
import {
  Award,
  CheckCircle2,
  GraduationCap,
  Mail,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { GenerateCurveButton } from './generate-button'
import { MasteryCurveChart } from './mastery-curve-chart'

/**
 * Admin per-student "learning curve" detail.
 *
 * Renders the same data the PDF report shows — so admins can preview
 * what a recruiter would see before clicking "Generate PDF". The button
 * itself calls a server action that runs the generation pipeline and
 * returns the public PDF URL.
 */
export default async function AdminLearningCurveDetailPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale; userId: string }>
}) {
  const { locale, userId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const tier = await getAccessTier(session.user.id)
  if (!isAdmin(tier)) redirect(`/${locale}/dashboard`)
  const adminUserId = session.user.id

  const curve = await getLearningCurve(userId)
  if (!curve) notFound()

  async function generate(): Promise<{ pdfUrl: string; reused: boolean } | { error: string }> {
    'use server'
    try {
      const appBaseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
      const { report, reused } = await generateLearningCurveReport({
        userId,
        generatedByUserId: adminUserId,
        appBaseUrl,
      })
      return { pdfUrl: report.pdfUrl, reused }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[learning-curves] generate failed', err)
      return { error: msg }
    }
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-3 flex items-center gap-3">
          <Link
            href={`/${locale}/admin/learning-curves`}
            className="font-mono text-[10px] uppercase tracking-wider text-fg-muted hover:text-fg"
          >
            ← Back
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/5 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-warning">
            <Sparkles className="h-3 w-3" />
            Admin
          </span>
        </div>

        {/* ── Student header ───────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{curve.user.name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {curve.user.email}
              </span>
              {curve.user.enrolledAt && (
                <span className="inline-flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Enrolled {new Date(curve.user.enrolledAt).toLocaleDateString()}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-elev px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider">
                {curve.user.market === 'ksa' ? 'KSA' : 'India'} Track
              </span>
            </p>
          </div>
          <GenerateCurveButton generate={generate} />
        </div>

        {/* ── Top score row ────────────────────────────────── */}
        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            icon={<Target className="h-4 w-4" />}
            label="Entry assessment"
            value={curve.entryTest ? `${Math.round(curve.entryTest.score * 100)}%` : '—'}
            sub={
              curve.entryTest ? `Placed in Phase ${curve.entryTest.placedPhase}` : 'Not yet taken'
            }
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Overall mastery"
            value={`${Math.round(curve.overallMastery * 100)}%`}
            sub={`${curve.totalDaysActive} active days`}
          />
          <StatCard
            icon={<Award className="h-4 w-4" />}
            label="Grand test"
            value={curve.grandTest ? `${Math.round(curve.grandTest.score * 100)}%` : '—'}
            sub={<GrandTestSub grandTest={curve.grandTest} />}
          />
        </section>

        {/* ── Phase progress bars ───────────────────────── */}
        <section className="mt-10">
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
            Phase progress
          </h2>
          {curve.phases.length === 0 ? (
            <p className="rounded-2xl border border-border bg-bg-elev/40 p-6 text-sm text-fg-muted">
              No curriculum data yet.
            </p>
          ) : (
            <div className="space-y-3">
              {curve.phases.map((p) => (
                <PhaseProgressRow key={p.phaseId} phase={p} />
              ))}
            </div>
          )}
        </section>

        {/* ── Mastery trajectory ─────────────────────────── */}
        <section className="mt-10">
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
            Mastery over phases
          </h2>
          <div className="rounded-2xl border border-border bg-bg-elev/40 p-6">
            <MasteryCurveChart phases={curve.phases} />
            <p className="mt-3 text-[11px] text-fg-subtle">
              Mean mastery (0–100%) across each curriculum phase. The line traces the
              candidate&apos;s learning trajectory.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}

// ── Subcomponents ──────────────────────────────────────────────

function GrandTestSub({ grandTest }: { grandTest: LearningCurve['grandTest'] }) {
  if (!grandTest) return <>Not yet attempted</>
  const Icon = grandTest.passed ? CheckCircle2 : XCircle
  const tone = grandTest.passed ? 'text-success' : 'text-danger'
  return (
    <span className={`inline-flex items-center gap-1 ${tone}`}>
      <Icon className="h-3 w-3" />
      {grandTest.passed ? 'Passed' : 'Not passed'}
    </span>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-elev/40 p-4">
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        {icon}
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-fg-muted">{sub}</p>
    </div>
  )
}

function PhaseProgressRow({ phase }: { phase: LearningCurve['phases'][number] }) {
  const completionPct = phase.totalLessons > 0 ? phase.completedLessons / phase.totalLessons : 0
  return (
    <div className="rounded-xl border border-border bg-bg-elev/30 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">
          Phase {phase.order} · {phase.titleEn}
        </p>
        <p className="text-xs text-fg-muted">
          {phase.completedLessons}/{phase.totalLessons} lessons ·{' '}
          {Math.round(phase.masteryAvg * 100)}% mastery
        </p>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-bg-elev">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.round(completionPct * 100)}%` }}
        />
      </div>
      <div className="mt-1 h-1 w-full rounded-full bg-bg-elev">
        <div
          className="h-full rounded-full bg-accent/40"
          style={{ width: `${Math.round(phase.masteryAvg * 100)}%` }}
        />
      </div>
    </div>
  )
}
