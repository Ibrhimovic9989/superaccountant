import { AppNav } from '@/components/app-nav'
import { ActivityHeatmap } from '@/components/learning-curve/activity-heatmap'
import { EngagementLineChart } from '@/components/learning-curve/engagement-line-chart'
import { InsightCards } from '@/components/learning-curve/insight-cards'
import { MasteryDistributionDonut } from '@/components/learning-curve/mastery-distribution-donut'
import { ShareCredentialsCard } from '@/components/learning-curve/share-credentials-card'
import { SubjectStrengthList } from '@/components/learning-curve/subject-strength-list'
import { WeeklyAttemptsBars } from '@/components/learning-curve/weekly-attempts-bars'
import { auth } from '@/lib/auth'
import { prisma } from '@sa/db'
import { type LearningCurve, getLearningCurve } from '@/lib/learning-curves/aggregate'
import { getLearningInsights } from '@/lib/learning-curves/insights'
import { findRecentReportForUser } from '@/lib/learning-curves/store'
import type { SupportedLocale } from '@sa/i18n'
import {
  Award,
  CheckCircle2,
  GraduationCap,
  LineChart,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { redirect } from 'next/navigation'

/**
 * Student-facing live learning curve.
 *
 * Per CA Muneer's voice note (2026-06-17): "from day 1 to day 60... the
 * full curve should be ready — with graphs, subject-wise marks, command
 * level — so recruiters can size up the candidate without re-assessing."
 *
 * The page is structured around what a hiring manager actually wants to
 * know about a graduate, in this order:
 *
 *   1. Headline pass numbers       (entry / overall / grand)
 *   2. Recruiter-shareable links   (cert + curve verify URLs)
 *   3. Four "insight" cards
 *        improvement   how much they grew (entry → grand delta)
 *        discipline    did they show up (active days, streak, consistency)
 *        cohort rank   are they above average vs the same-market cohort
 *        recovery      what they did when they got something wrong
 *   4. Subject-strength split      top-5 mastery vs bottom-5
 *   5. 60-day activity heatmap
 *
 * All data is live — no cache.
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

  // Live data, in parallel.
  const ONE_HUNDRED_YEARS = 100 * 365 * 24 * 60 * 60 * 1000
  const [curve, insights, report, latestCert] = await Promise.all([
    getLearningCurve(userId),
    getLearningInsights(userId).catch(() => null),
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
      <main className="mx-auto max-w-6xl px-6 py-12">
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

        {/* ── Headline pass numbers ────────────────────────── */}
        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            icon={<Target className="h-4 w-4" />}
            label={t.entry}
            value={curve.entryTest ? `${Math.round(curve.entryTest.score * 100)}%` : '—'}
            sub={
              curve.entryTest ? t.placedPhase(curve.entryTest.placedPhase) : t.notYetTaken
            }
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label={t.overall}
            value={`${Math.round(curve.overallMastery * 100)}%`}
            sub={t.activeDays(curve.totalDaysActive)}
          />
          <StatCard
            icon={<Award className="h-4 w-4" />}
            label={t.grand}
            value={curve.grandTest ? `${Math.round(curve.grandTest.score * 100)}%` : '—'}
            sub={<GrandTestSub grandTest={curve.grandTest} locale={locale} />}
          />
        </section>

        {/* ── Share with recruiter ─────────────────────────── */}
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

        {/* ── Insight cards: improvement / discipline / percentile / recovery ── */}
        {insights && (
          <section className="mt-10">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold tracking-tight">
              <LineChart className="h-4 w-4 text-accent" />
              {t.deepEyebrow}
            </h2>
            <p className="mb-5 text-sm text-fg-muted">{t.deepSubtitle}</p>
            <InsightCards
              insights={insights}
              labels={{
                improvement: t.improvement,
                discipline: t.discipline,
                percentile: t.percentile,
                recovery: t.recovery,
              }}
            />
          </section>
        )}

        {/* ── Mastery split donut + Engagement line ───────── */}
        {insights && (
          <section className="mt-10">
            <h2 className="mb-1 text-lg font-semibold tracking-tight">{t.shapeTitle}</h2>
            <p className="mb-5 text-sm text-fg-muted">{t.shapeSubtitle}</p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <MasteryDistributionDonut
                  d={insights.masteryDistribution}
                  labels={{
                    eyebrow: t.donutEyebrow,
                    mastered: t.donutMastered,
                    proficient: t.donutProficient,
                    weak: t.donutWeak,
                    untouched: t.donutUntouched,
                    center: (m, total) => (total === 0 ? '—' : `${m}/${total}`),
                    centerSub: t.donutCenterSub,
                  }}
                />
              </div>
              <div className="lg:col-span-3">
                <EngagementLineChart
                  data={insights.dailyEngagement}
                  labels={{
                    eyebrow: t.lineEyebrow,
                    yLabel: t.lineY,
                    today: t.today,
                    start: t.dayZero,
                  }}
                />
              </div>
            </div>
          </section>
        )}

        {/* ── Weekly attempt volume bars ──────────────────── */}
        {insights && insights.weeklyAttempts.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-1 text-lg font-semibold tracking-tight">{t.barsTitle}</h2>
            <p className="mb-5 text-sm text-fg-muted">{t.barsSubtitle}</p>
            <WeeklyAttemptsBars
              data={insights.weeklyAttempts}
              labels={{
                eyebrow: t.barsEyebrow,
                yLabel: t.barsY,
                noData: t.barsNoData,
              }}
            />
          </section>
        )}

        {/* ── Subject strengths ────────────────────────────── */}
        {insights && (insights.topModules.length > 0 || insights.bottomModules.length > 0) && (
          <section className="mt-10">
            <h2 className="mb-1 text-lg font-semibold tracking-tight">{t.subjectsTitle}</h2>
            <p className="mb-5 text-sm text-fg-muted">{t.subjectsSubtitle}</p>
            <SubjectStrengthList
              top={insights.topModules}
              bottom={insights.bottomModules}
              locale={locale}
              labels={{
                strongest: t.strongest,
                weakest: t.weakest,
                mastery: t.masteryLabel,
                lessons: t.lessonsLabel,
              }}
            />
          </section>
        )}

        {/* ── 60-day activity heatmap ──────────────────────── */}
        {insights && (
          <section className="mt-10">
            <h2 className="mb-1 text-lg font-semibold tracking-tight">{t.heatmapTitle}</h2>
            <p className="mb-5 text-sm text-fg-muted">{t.heatmapSubtitle}</p>
            <div className="rounded-2xl border border-border bg-bg-elev/40 p-5">
              <ActivityHeatmap days={insights.activityHeatmap} />
            </div>
          </section>
        )}
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
      'A working profile — not just lessons completed but signal a recruiter can use. Refreshes the moment you finish a lesson.',
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
    deepEyebrow: 'Deep insights',
    deepSubtitle:
      'Each card answers one question a hiring manager will ask. All numbers are live — computed from your own assessment and lesson data.',
    subjectsTitle: 'Subject strengths',
    subjectsSubtitle:
      "Where you've built command vs. where you're still climbing. Mastery is the system's tuned 0–100% estimate from every attempt across every lesson in that module.",
    strongest: 'Strongest 5',
    weakest: 'Still climbing',
    masteryLabel: 'mastery',
    lessonsLabel: 'lessons touched',
    heatmapTitle: 'Activity over the last 60 days',
    heatmapSubtitle:
      'One cell per day, darker = more lessons touched that day. The pattern reads at a glance: consistent grind vs. burst-and-rest vs. abandoned days.',
    shapeTitle: 'Shape of the journey',
    shapeSubtitle:
      'Where you are right now (donut) and how you got there (line). A steep ramp early followed by review is a different story than a flat then late-spike pattern.',
    donutEyebrow: 'Mastery split',
    donutMastered: 'Mastered (≥ 80%)',
    donutProficient: 'Proficient (50–80%)',
    donutWeak: 'Weak (< 50%)',
    donutUntouched: 'Untouched',
    donutCenterSub: 'mastered',
    lineEyebrow: 'Lessons engaged · cumulative',
    lineY: 'lessons',
    today: 'today',
    dayZero: 'from',
    barsTitle: 'Assessment volume by week',
    barsSubtitle:
      'How many tests you took each week — and how well each batch scored. Bar height = volume, colour = mean score (red weak · violet passing · green strong).',
    barsEyebrow: 'Attempts per week (last 12 ISO weeks)',
    barsY: 'attempts',
    barsNoData: 'No graded assessments yet.',
    improvement: {
      title: 'Improvement',
      gain: (pts: number) =>
        pts > 0
          ? `From entry to grand — that's real growth on the same syllabus.`
          : pts < 0
            ? `Grand test scored below entry. Worth a re-attempt to lift this.`
            : `Held the same line from entry to grand. Steady but not climbing.`,
      sub: 'Entry → Grand',
      needsData: 'Take both entry + grand tests to see this signal.',
    },
    discipline: {
      title: 'Discipline',
      active: (d: number) =>
        d >= 30
          ? 'Heavy active footprint over the cohort.'
          : d >= 10
            ? 'Steady but selective on which days they show up.'
            : 'Early days — the picture sharpens as more days log in.',
      sub: (streak: number) =>
        streak <= 1 ? 'no streak yet' : `${streak}-day streak best`,
      consistencyShort: (pct: number) => `· ${pct}% consistency`,
    },
    percentile: {
      title: 'Cohort rank',
      top: (n: number) =>
        n <= 10
          ? 'Outperforming nearly everyone on the same market track.'
          : n <= 25
            ? 'Comfortably above the cohort median.'
            : n <= 50
              ? 'In the upper half of the cohort.'
              : 'Below the cohort median — still room to climb.',
      sub: (cohort: number) => `vs. ${cohort} same-track peers`,
      needsCohort: (n: number) =>
        n === 0
          ? "Cohort hasn't started recording mastery yet."
          : `Cohort still too small to rank (${n} peers).`,
    },
    recovery: {
      title: 'Recovery rate',
      rate: (pct: number) =>
        pct >= 80
          ? 'Comes back at hard topics until they stick. Strong grit signal.'
          : pct >= 50
            ? 'Half of the topics they struggled with came back to mastery.'
            : 'A few weak topics still pending review.',
      sub: (n: number, total: number) => `${n} of ${total} weak lessons mastered`,
      needsData: 'No weak topics on record yet.',
    },
    noData:
      "We couldn't load your learning record yet. Refresh in a moment — if this keeps happening, ping your cohort lead.",
  },
  ar: {
    eyebrow: 'منحنى التعلم',
    title: 'مسارك من اليوم الأول حتى الآن',
    subtitle:
      'ملف حي — ليس فقط دروسًا مكتملة بل إشارات يستطيع المسؤول عن التوظيف استخدامها. يتحدّث فور إنهائك لأي درس.',
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
    deepEyebrow: 'تحليلات عميقة',
    deepSubtitle:
      'كل بطاقة تجيب على سؤال يطرحه المسؤول عن التوظيف. كل الأرقام حية — مُحتسبة من بيانات تقييماتك ودروسك.',
    subjectsTitle: 'نقاط القوة بحسب المادة',
    subjectsSubtitle:
      'حيث أتقنت مقابل ما لا يزال يحتاج عملاً. الإتقان هو تقدير النظام المُعدّل من 0–100٪ بناءً على كل محاولاتك في الدروس داخل تلك الوحدة.',
    strongest: 'أقوى ٥',
    weakest: 'لا يزال في التقدم',
    masteryLabel: 'إتقان',
    lessonsLabel: 'دروس تم تناولها',
    heatmapTitle: 'النشاط خلال آخر ٦٠ يوماً',
    heatmapSubtitle:
      'خلية لكل يوم، الأغمق = دروس أكثر في ذلك اليوم. يُقرأ النمط بنظرة واحدة: مثابرة منتظمة أم انفجار وراحة أم أيام متروكة.',
    shapeTitle: 'شكل الرحلة',
    shapeSubtitle:
      'أين أنت الآن (الكعكة) وكيف وصلت إلى هنا (الخط). البداية الحادة المتبوعة بالمراجعة قصة مختلفة عن نمط مسطح ثم قفزة متأخرة.',
    donutEyebrow: 'توزيع الإتقان',
    donutMastered: 'متقن (≥ ٨٠٪)',
    donutProficient: 'كفاءة (٥٠–٨٠٪)',
    donutWeak: 'ضعيف (< ٥٠٪)',
    donutUntouched: 'لم يُلمس',
    donutCenterSub: 'متقن',
    lineEyebrow: 'الدروس التي تم تناولها · تراكمي',
    lineY: 'دروس',
    today: 'اليوم',
    dayZero: 'من',
    barsTitle: 'حجم التقييمات بحسب الأسبوع',
    barsSubtitle:
      'عدد الاختبارات في كل أسبوع — ومدى نجاح كل دفعة. الارتفاع = العدد، اللون = متوسط النتيجة (أحمر ضعيف · بنفسجي مقبول · أخضر قوي).',
    barsEyebrow: 'المحاولات في الأسبوع (آخر ١٢ أسبوعاً)',
    barsY: 'محاولات',
    barsNoData: 'لا توجد تقييمات مُصحَّحة بعد.',
    improvement: {
      title: 'التحسّن',
      gain: (pts: number) =>
        pts > 0
          ? 'من الدخول إلى النهاية — نمو حقيقي على نفس المنهج.'
          : pts < 0
            ? 'الاختبار النهائي أقل من الدخول. يستحق إعادة المحاولة للارتقاء.'
            : 'حافظت على المستوى من الدخول إلى النهاية. ثبات بدون صعود.',
      sub: 'الدخول ← النهائي',
      needsData: 'اخضع لاختباري الدخول والنهاية لرؤية هذه الإشارة.',
    },
    discipline: {
      title: 'الانضباط',
      active: (d: number) =>
        d >= 30
          ? 'بصمة نشاط ضخمة خلال الدورة.'
          : d >= 10
            ? 'منتظم لكن انتقائي في أيام الحضور.'
            : 'في البداية — الصورة تتضح مع تسجيل المزيد من الأيام.',
      sub: (streak: number) =>
        streak <= 1 ? 'بدون تتابع بعد' : `أفضل تتابع ${streak} أيام`,
      consistencyShort: (pct: number) => `· ${pct}٪ ثبات`,
    },
    percentile: {
      title: 'الترتيب في الدفعة',
      top: (n: number) =>
        n <= 10
          ? 'يتفوق على معظم زملاء نفس المسار.'
          : n <= 25
            ? 'فوق متوسط الدفعة براحة.'
            : n <= 50
              ? 'في النصف الأعلى من الدفعة.'
              : 'تحت متوسط الدفعة — لا يزال هناك مجال للارتقاء.',
      sub: (cohort: number) => `مقابل ${cohort} زميل في نفس المسار`,
      needsCohort: (n: number) =>
        n === 0
          ? 'الدفعة لم تبدأ تسجيل الإتقان بعد.'
          : `الدفعة لا تزال صغيرة للترتيب (${n} زميل).`,
    },
    recovery: {
      title: 'معدّل الاستدراك',
      rate: (pct: number) =>
        pct >= 80
          ? 'يعود للمواضيع الصعبة حتى يتقنها. إشارة عزيمة قوية.'
          : pct >= 50
            ? 'نصف المواضيع التي واجه فيها صعوبة عاد إليها وأتقنها.'
            : 'بعض المواضيع الضعيفة لا تزال بانتظار المراجعة.',
      sub: (n: number, total: number) => `${n} من ${total} درساً ضعيفاً تم إتقانه`,
      needsData: 'لا توجد مواضيع ضعيفة مُسجّلة بعد.',
    },
    noData:
      'لم نتمكن من تحميل سجل التعلم الخاص بك بعد. حدّث الصفحة بعد قليل — إذا استمر هذا، تواصل مع قائد المجموعة.',
  },
} as const

// ──────────────────────────────────────────────────────────────
// Sub components
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
