import { AppNav } from '@/components/app-nav'
import { ShareCredentialsCard } from '@/components/learning-curve/share-credentials-card'
import { auth } from '@/lib/auth'
import { prisma } from '@sa/db'
import { type LearningCurve, getLearningCurve } from '@/lib/learning-curves/aggregate'
import { findRecentReportForUser } from '@/lib/learning-curves/store'
import { MasteryCurveChart } from '@/app/[locale]/admin/learning-curves/[userId]/mastery-curve-chart'
import type { SupportedLocale } from '@sa/i18n'
import {
  Award,
  CheckCircle2,
  Flame,
  GraduationCap,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { redirect } from 'next/navigation'

/**
 * Student-facing live learning curve. The same aggregation the admin
 * page renders, scoped to `session.user.id` — so every student sees
 * their own day-1-to-now trajectory the moment they log in.
 *
 * Founder's ask (CA Muneer, 2026-06-17 voice note):
 *   "The learning curve has to be designed at the back end. Day 1 to
 *    Day 60, the moment he comes out of the cohort, the full curve
 *    should be ready — with graphs, subject-wise marks, command level
 *    — so recruiters can size up the candidate without re-assessing."
 *
 * This page is the "always-on" view of that curve. The PDF that goes
 * to recruiters is rendered from the same data and bundled with the
 * certificate email at issuance time.
 */
export default async function MyProgressPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const userId = session.user.id

  const t = COPY[locale === 'ar' ? 'ar' : 'en']

  // Live data — no cache. Per the founder: "should show from day 1 to
  // student and admin." Re-fetched on every navigation.
  const curve = await getLearningCurve(userId)

  // Existing PDF report (any age). Pass a 100-year ceiling so we get
  // whatever's most recent for this user without inventing a new helper.
  const ONE_HUNDRED_YEARS = 100 * 365 * 24 * 60 * 60 * 1000
  const [report, latestCert] = await Promise.all([
    findRecentReportForUser(userId, ONE_HUNDRED_YEARS).catch(() => null),
    prisma.certificationCertificate
      .findFirst({
        where: { userId },
        orderBy: { issuedAt: 'desc' },
        select: { hash: true, score: true, issuedAt: true },
      })
      .catch(() => null),
  ])

  if (!curve) {
    return (
      <div className="min-h-screen bg-bg text-fg">
        <AppNav
          locale={locale}
          userName={session.user.name ?? null}
          userEmail={session.user.email ?? ''}
        />
        <main className="mx-auto max-w-3xl px-6 py-20">
          <p className="text-sm text-fg-muted">{t.noData}</p>
        </main>
      </div>
    )
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
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft/50 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-accent">
            <Sparkles className="h-3 w-3" />
            {t.eyebrow}
          </span>
        </div>

        {/* ── Hero ─────────────────────────────────────────── */}
        <header className="border-b border-border pb-6">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-fg-muted">{t.subtitle}</p>
          {curve.user.enrolledAt && (
            <p className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
              <GraduationCap className="h-3.5 w-3.5" />
              {t.enrolled}{' '}
              {new Date(curve.user.enrolledAt).toLocaleDateString(
                locale === 'ar' ? 'ar-EG' : 'en-GB',
                { day: '2-digit', month: 'short', year: 'numeric' },
              )}
            </p>
          )}
        </header>

        {/* ── Key stats ────────────────────────────────────── */}
        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            icon={<Target className="h-4 w-4" />}
            label={t.entry}
            value={curve.entryTest ? `${Math.round(curve.entryTest.score * 100)}%` : '—'}
            sub={
              curve.entryTest
                ? t.placedPhase(curve.entryTest.placedPhase)
                : t.notYetTaken
            }
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label={t.overall}
            value={`${Math.round(curve.overallMastery * 100)}%`}
            sub={
              <span className="inline-flex items-center gap-1.5">
                <Flame className="h-3 w-3 text-warning" />
                {t.activeDays(curve.totalDaysActive)}
              </span>
            }
          />
          <StatCard
            icon={<Award className="h-4 w-4" />}
            label={t.grand}
            value={curve.grandTest ? `${Math.round(curve.grandTest.score * 100)}%` : '—'}
            sub={<GrandTestSub grandTest={curve.grandTest} locale={locale} />}
          />
        </section>

        {/* ── Share with recruiter (only once we have something to share) ── */}
        {(report || latestCert) && (
          <section className="mt-10">
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
              {t.shareEyebrow}
            </h2>
            <ShareCredentialsCard
              locale={locale}
              curveVerifyHash={report?.verifyHash ?? null}
              curvePdfUrl={report?.pdfUrl ?? null}
              certVerifyHash={latestCert?.hash ?? null}
            />
          </section>
        )}

        {/* ── Phase progress bars ──────────────────────────── */}
        <section className="mt-10">
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
            {t.phaseProgress}
          </h2>
          {curve.phases.length === 0 ? (
            <p className="rounded-2xl border border-border bg-bg-elev/40 p-6 text-sm text-fg-muted">
              {t.noCurriculum}
            </p>
          ) : (
            <div className="space-y-3">
              {curve.phases.map((p) => (
                <PhaseProgressRow
                  key={p.phaseId}
                  phase={p}
                  locale={locale}
                  copy={t}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Trajectory chart ─────────────────────────────── */}
        <section className="mt-10">
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
            {t.trajectory}
          </h2>
          <div className="rounded-2xl border border-border bg-bg-elev/40 p-6">
            <MasteryCurveChart phases={curve.phases} />
            <p className="mt-3 text-[11px] text-fg-subtle">{t.trajectoryHelp}</p>
          </div>
        </section>
      </main>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Bilingual copy
// ──────────────────────────────────────────────────────────────

const COPY = {
  en: {
    eyebrow: 'Learning curve',
    title: 'Your day-1-to-now trajectory',
    subtitle:
      "Everything you've mastered, attempted and where you're heading. The same picture recruiters see when you share your profile.",
    enrolled: 'Enrolled',
    entry: 'Entry assessment',
    overall: 'Overall mastery',
    grand: 'Grand test',
    placedPhase: (n: number) => `Placed in Phase ${n}`,
    notYetTaken: 'Not yet taken',
    activeDays: (n: number) => `${n} active ${n === 1 ? 'day' : 'days'}`,
    passed: 'Passed',
    notPassed: 'Not yet passed',
    notAttempted: 'Not yet attempted',
    shareEyebrow: 'Share with recruiters',
    phaseProgress: 'Phase progress',
    noCurriculum: 'Curriculum loading — check back in a moment.',
    trajectory: 'Mastery over phases',
    trajectoryHelp:
      'Mean mastery (0–100%) across each curriculum phase. The line traces your learning trajectory — the same chart that lands in the PDF report to recruiters.',
    phaseLabel: (n: number) => `Phase ${n}`,
    lessonsDone: (done: number, total: number) =>
      `${done}/${total} lessons · ${Math.round((total ? done / total : 0) * 100)}% complete`,
    mastery: (m: number) => `${Math.round(m * 100)}% mastery`,
    noData:
      "We couldn't load your learning record yet. Refresh in a moment — if this keeps happening, ping your cohort lead.",
  },
  ar: {
    eyebrow: 'منحنى التعلم',
    title: 'مسارك من اليوم الأول حتى الآن',
    subtitle:
      'كل ما أتقنته، حاولته، والمكان الذي تتجه إليه. هذه الصورة نفسها التي يراها المسؤولون عن التوظيف عند مشاركة ملفك.',
    enrolled: 'تاريخ الالتحاق',
    entry: 'تقييم الدخول',
    overall: 'الإتقان الكلي',
    grand: 'الاختبار النهائي',
    placedPhase: (n: number) => `وُضِعت في المرحلة ${n}`,
    notYetTaken: 'لم يتم بعد',
    activeDays: (n: number) => `${n} ${n === 1 ? 'يوم نشاط' : 'أيام نشاط'}`,
    passed: 'نجحت',
    notPassed: 'لم تنجح بعد',
    notAttempted: 'لم تحاول بعد',
    shareEyebrow: 'شارك مع المسؤولين عن التوظيف',
    phaseProgress: 'تقدم المراحل',
    noCurriculum: 'يتم تحميل المنهج — تحقق بعد لحظات.',
    trajectory: 'الإتقان عبر المراحل',
    trajectoryHelp:
      'متوسط الإتقان (0–100٪) عبر كل مرحلة من مراحل المنهج. الخط يرسم مسار تعلمك — نفس الرسم البياني في تقرير PDF للمسؤولين عن التوظيف.',
    phaseLabel: (n: number) => `المرحلة ${n}`,
    lessonsDone: (done: number, total: number) =>
      `${done}/${total} درس · ${Math.round((total ? done / total : 0) * 100)}٪ مكتمل`,
    mastery: (m: number) => `${Math.round(m * 100)}٪ إتقان`,
    noData:
      'لم نتمكن من تحميل سجل التعلم الخاص بك بعد. حدّث الصفحة بعد قليل — إذا استمر هذا، تواصل مع قائد المجموعة.',
  },
} as const

// ──────────────────────────────────────────────────────────────
// Subcomponents
// ──────────────────────────────────────────────────────────────

function GrandTestSub({
  grandTest,
  locale,
}: {
  grandTest: LearningCurve['grandTest']
  locale: SupportedLocale
}) {
  const t = COPY[locale === 'ar' ? 'ar' : 'en']
  if (!grandTest) return <>{t.notAttempted}</>
  const Icon = grandTest.passed ? CheckCircle2 : XCircle
  const tone = grandTest.passed ? 'text-success' : 'text-danger'
  return (
    <span className={`inline-flex items-center gap-1 ${tone}`}>
      <Icon className="h-3 w-3" />
      {grandTest.passed ? t.passed : t.notPassed}
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

function PhaseProgressRow({
  phase,
  locale,
  copy,
}: {
  phase: LearningCurve['phases'][number]
  locale: SupportedLocale
  copy: typeof COPY[keyof typeof COPY]
}) {
  const completionPct = phase.totalLessons > 0 ? phase.completedLessons / phase.totalLessons : 0
  const title = locale === 'ar' ? phase.titleAr : phase.titleEn
  return (
    <div className="rounded-xl border border-border bg-bg-elev/30 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">
          {copy.phaseLabel(phase.order)} · {title}
        </p>
        <p className="text-xs text-fg-muted">
          {copy.lessonsDone(phase.completedLessons, phase.totalLessons)} ·{' '}
          {copy.mastery(phase.masteryAvg)}
        </p>
      </div>
      {/* Completion bar (filled) + mastery bar (faded) — same dual track
          the admin view uses so the two surfaces visually match. */}
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
