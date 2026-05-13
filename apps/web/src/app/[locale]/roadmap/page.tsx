import { AppNav } from '@/components/app-nav'
import { BlurFade } from '@/components/magicui/blur-fade'
import { BorderBeam } from '@/components/magicui/border-beam'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { Badge } from '@/components/ui/badge'
import { auth } from '@/lib/auth'
import { getAccessTier, hasFullAccess } from '@/lib/cohort/access'
import { getUserProfile } from '@/lib/data/profile'
import { type RoadmapPhase, getRoadmap } from '@/lib/data/roadmap'
import { cn } from '@/lib/utils'
import type { SupportedLocale } from '@sa/i18n'
import { ArrowRight, BookOpen, Check, Lock, Map as MapIcon, Target } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const COPY = {
  en: {
    badge: 'Roadmap',
    title: 'Your learning path',
    subtitle: 'Every phase, module, and lesson in your track — with your progress mapped.',
    completedOf: 'of',
    lessonsCompleted: 'lessons completed',
    weeksLeft: 'weeks left',
    weeksLeftSub: 'at your current pace',
    targetDate: 'Target exam',
    noTarget: 'Not set',
    phase: 'Phase',
    current: 'Current',
    completed: 'Done',
    locked: 'Locked',
    mastery: 'mastery',
    continueLesson: 'Continue',
    startLesson: 'Start',
  },
  ar: {
    badge: 'خريطة الطريق',
    title: 'مسار تعلمك',
    subtitle: 'كل مرحلة ووحدة ودرس في مسارك — مع تقدمك مرسومًا.',
    completedOf: 'من',
    lessonsCompleted: 'دروس مكتملة',
    weeksLeft: 'أسابيع متبقية',
    weeksLeftSub: 'بوتيرتك الحالية',
    targetDate: 'تاريخ الامتحان',
    noTarget: 'لم يُحدد',
    phase: 'المرحلة',
    current: 'الحالي',
    completed: 'مكتمل',
    locked: 'مقفل',
    mastery: 'إتقان',
    continueLesson: 'تابع',
    startLesson: 'ابدأ',
  },
} as const

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const tier = await getAccessTier(session.user.id)
  if (!hasFullAccess(tier)) redirect(`/${locale}/cohort`)

  const u = await getUserProfile(session.user.id)
  if (!u?.preferredTrack) redirect(`/${locale}/welcome`)

  const roadmap = await getRoadmap(session.user.id, u.preferredTrack)
  const t = COPY[locale]
  const pct =
    roadmap.totalLessons > 0
      ? Math.round((roadmap.completedLessons / roadmap.totalLessons) * 100)
      : 0

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-fg">
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
        {/* Header */}
        <BlurFade delay={0.05}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            <MapIcon className="h-3 w-3 text-accent" />
            {t.badge}
          </div>
        </BlurFade>
        <BlurFade delay={0.1}>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
        </BlurFade>
        <BlurFade delay={0.15}>
          <p className="mt-3 max-w-xl text-sm text-fg-muted sm:text-base">{t.subtitle}</p>
        </BlurFade>

        {/* Stats strip */}
        <BlurFade delay={0.2}>
          <div className="mt-8 grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-bg-elev/50 backdrop-blur rtl:divide-x-reverse">
            <div className="p-4 text-center sm:p-5">
              <div className="flex items-baseline justify-center gap-1">
                <NumberTicker
                  value={roadmap.completedLessons}
                  className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
                />
                <span className="text-xs text-fg-subtle">/ {roadmap.totalLessons}</span>
              </div>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-fg-subtle sm:text-[10px]">
                {t.lessonsCompleted}
              </p>
            </div>
            <div className="p-4 text-center sm:p-5">
              {roadmap.estimatedWeeksLeft !== null ? (
                <>
                  <NumberTicker
                    value={roadmap.estimatedWeeksLeft}
                    className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
                  />
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-fg-subtle sm:text-[10px]">
                    {t.weeksLeft}
                  </p>
                </>
              ) : (
                <>
                  <span className="font-mono text-2xl text-fg-subtle">—</span>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-fg-subtle sm:text-[10px]">
                    {t.weeksLeftSub}
                  </p>
                </>
              )}
            </div>
            <div className="p-4 text-center sm:p-5">
              <span className="font-mono text-2xl font-medium tracking-tight sm:text-3xl">
                {roadmap.targetExamDate
                  ? roadmap.targetExamDate.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', {
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </span>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-fg-subtle sm:text-[10px]">
                {t.targetDate}
              </p>
            </div>
          </div>
        </BlurFade>

        {/* Overall progress bar */}
        <BlurFade delay={0.25}>
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs text-fg-muted">
              <span>
                {pct}% {t.completed}
              </span>
              <span>
                {roadmap.completedLessons} {t.completedOf} {roadmap.totalLessons}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-bg-overlay">
              <div
                className="h-full rounded-full bg-accent transition-all duration-700"
                style={{ width: `${Math.max(pct, 1)}%` }}
              />
            </div>
          </div>
        </BlurFade>

        {/* Phase timeline */}
        <div className="relative mt-14">
          {/* Vertical line */}
          <div className="absolute bottom-0 start-[19px] top-0 w-px bg-border sm:start-[23px]" />

          <div className="space-y-10">
            {roadmap.phases.map((phase, phaseIdx) => (
              <PhaseCard
                key={phase.order}
                phase={phase}
                locale={locale}
                t={t}
                phaseIdx={phaseIdx}
                totalPhases={roadmap.phases.length}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

function PhaseCard({
  phase,
  locale,
  t,
  phaseIdx,
}: {
  phase: RoadmapPhase
  locale: 'en' | 'ar'
  t: (typeof COPY)[keyof typeof COPY]
  phaseIdx: number
  totalPhases: number
}) {
  const isDone = phase.completedCount === phase.totalCount && phase.totalCount > 0
  const isCurrent = !isDone && phase.completedCount > 0
  const phasePct =
    phase.totalCount > 0 ? Math.round((phase.completedCount / phase.totalCount) * 100) : 0

  return (
    <BlurFade delay={0.1 + phaseIdx * 0.06}>
      <div className="relative ps-12 sm:ps-14">
        {/* Timeline dot */}
        <span
          className={cn(
            'absolute start-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 sm:h-12 sm:w-12',
            isDone
              ? 'border-success bg-success/10 text-success'
              : isCurrent
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-border bg-bg-elev text-fg-subtle',
          )}
        >
          {isDone ? (
            <Check className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <span className="font-mono text-xs font-bold sm:text-sm">{phase.order}</span>
          )}
        </span>

        {/* Phase header */}
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            {locale === 'ar' ? phase.titleAr : phase.titleEn}
          </h2>
          <Badge
            variant={isDone ? 'default' : isCurrent ? 'accent' : 'default'}
            className={cn(
              isDone && 'border-success/30 bg-success/10 text-success',
              !isDone && !isCurrent && 'text-fg-subtle',
            )}
          >
            {isDone ? t.completed : isCurrent ? t.current : t.locked}
          </Badge>
          <span className="font-mono text-[10px] tabular-nums text-fg-subtle">
            {phase.completedCount}/{phase.totalCount}
          </span>
        </div>

        {/* Phase progress bar */}
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-bg-overlay">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              isDone ? 'bg-success' : 'bg-accent',
            )}
            style={{ width: `${phasePct}%` }}
          />
        </div>

        {/* Modules */}
        <div className="mt-5 space-y-4">
          {phase.modules.map((mod) => {
            const modDone = mod.completedCount === mod.totalCount && mod.totalCount > 0
            return (
              <div
                key={`${mod.order}-${mod.titleEn}`}
                className="rounded-xl border border-border bg-bg-elev/50 p-4 backdrop-blur"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-fg-muted" />
                    <span className="text-sm font-medium">
                      {locale === 'ar' ? mod.titleAr : mod.titleEn}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] tabular-nums text-fg-subtle">
                    {mod.completedCount}/{mod.totalCount}
                  </span>
                </div>

                {/* Lessons list */}
                <div className="mt-3 space-y-1.5">
                  {mod.lessons.map((lesson) => (
                    <Link
                      key={lesson.slug}
                      href={`/${locale}/lessons/${lesson.slug}`}
                      className={cn(
                        'group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                        lesson.completed
                          ? 'bg-success/5 text-fg hover:bg-success/10'
                          : 'text-fg-muted hover:bg-bg-overlay hover:text-fg',
                      )}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {lesson.completed ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                        ) : modDone || isCurrent || isDone || lesson.mastery > 0 ? (
                          <Target className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
                        ) : (
                          <Lock className="h-3 w-3 shrink-0 text-fg-subtle" />
                        )}
                        <span className="truncate">
                          {locale === 'ar' ? lesson.titleAr : lesson.titleEn}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {lesson.mastery > 0 && (
                          <span className="font-mono text-[10px] tabular-nums text-fg-subtle">
                            {Math.round(lesson.mastery * 100)}%
                          </span>
                        )}
                        <ArrowRight className="h-3 w-3 text-fg-subtle opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </BlurFade>
  )
}
