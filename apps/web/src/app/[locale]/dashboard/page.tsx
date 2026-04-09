import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Flame,
  Sparkles,
  Target,
} from 'lucide-react'
import { auth } from '@/lib/auth'
import { getDashboardSnapshot } from '@/lib/data/dashboard'
import { getUserProfile } from '@/lib/data/profile'
import { AppNav } from '@/components/app-nav'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BlurFade } from '@/components/magicui/blur-fade'
import { BorderBeam } from '@/components/magicui/border-beam'
import { MagicCard } from '@/components/magicui/magic-card'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { AnimatedList } from '@/components/magicui/animated-list'
import { cn } from '@/lib/utils'

export default async function Dashboard({
  params,
}: {
  params: Promise<{ locale: 'en' | 'ar' }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)

  // First-run gate — market → profile → entry test, then dashboard.
  const u = await getUserProfile(session.user.id)
  if (!u?.preferredTrack) redirect(`/${locale}/welcome`)
  if (!u.profileCompletedAt) redirect(`/${locale}/welcome/profile`)

  const snap = await getDashboardSnapshot(session.user.id)
  const firstName =
    session.user.name?.split(' ')[0] ?? session.user.email?.split('@')[0] ?? ''
  const trackLabel =
    snap.market === 'india' ? 'India · Chartered Path' : "KSA · Mu'tamad Path"

  const masteryPct = Math.round(snap.averageMastery * 100)

  return (
    <div className="min-h-screen bg-bg text-fg">
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* ── Greeting ─────────────────────────────────────── */}
        <BlurFade delay={0.05}>
          <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
            {trackLabel}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {locale === 'ar' ? `مرحبًا، ${firstName}` : `Welcome back, ${firstName}.`}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-fg-muted">
            {locale === 'ar'
              ? 'استمر في رحلتك. المدرس الذكي بانتظارك.'
              : 'Pick up where you left off. Your AI tutor is one keystroke away.'}
          </p>
        </BlurFade>

        {/* ── Continue + Streak ────────────────────────────── */}
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <BlurFade delay={0.1} className="lg:col-span-2">
            {snap.resume ? (
              <MagicCard className="h-full rounded-xl">
                <div className="relative flex h-full flex-col gap-6 p-6 sm:p-8">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-accent" />
                      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                        {locale === 'ar' ? 'تابع' : 'Continue'}
                      </span>
                    </div>
                    <Badge variant="accent">
                      {Math.round(snap.resume.mastery * 100)}%{' '}
                      {locale === 'ar' ? 'إتقان' : 'mastery'}
                    </Badge>
                  </div>

                  <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                    {locale === 'ar' ? snap.resume.titleAr : snap.resume.titleEn}
                  </h2>

                  <div className="space-y-2">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-bg-overlay">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-700"
                        style={{ width: `${Math.max(snap.resume.mastery * 100, 4)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-auto flex items-center gap-3">
                    <div className="relative">
                      <Button
                        asChild
                        variant="accent"
                        size="lg"
                        className="relative overflow-hidden"
                      >
                        <Link href={`/${locale}/lessons/${snap.resume.slug}`}>
                          {locale === 'ar' ? 'استئناف الدرس' : 'Resume lesson'}
                          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                          <BorderBeam
                            size={48}
                            duration={6}
                            colorFrom="#a78bfa"
                            colorTo="#8b5cf6"
                          />
                        </Link>
                      </Button>
                    </div>
                    <span className="font-mono text-[11px] text-fg-subtle">⌘ ↵</span>
                  </div>
                </div>
              </MagicCard>
            ) : (
              <div className="flex h-full min-h-[260px] items-center justify-center rounded-xl border border-dashed border-border bg-bg-elev p-8 text-center">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                    {locale === 'ar' ? 'لا توجد دروس بعد' : 'No lessons yet'}
                  </p>
                  <p className="mt-2 text-sm text-fg-muted">
                    {locale === 'ar'
                      ? 'سيتم إنشاء الدروس قريبًا'
                      : 'Lessons will appear here as the curriculum is generated.'}
                  </p>
                </div>
              </div>
            )}
          </BlurFade>

          <BlurFade delay={0.15}>
            <div className="relative h-full overflow-hidden rounded-xl border border-border bg-bg-elev p-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                  {locale === 'ar' ? 'سلسلة' : 'Streak'}
                </span>
                <Flame className="h-4 w-4 text-warning" />
              </div>
              <div className="mt-6 flex items-baseline gap-1">
                <NumberTicker
                  value={snap.streakDays}
                  className="font-mono text-5xl font-medium tracking-tight"
                />
                <span className="font-mono text-sm text-fg-subtle">d</span>
              </div>
              <p className="mt-2 text-xs text-fg-muted">
                {snap.streakDays === 0
                  ? locale === 'ar'
                    ? 'ابدأ سلسلة جديدة اليوم'
                    : 'Start a new streak today'
                  : locale === 'ar'
                    ? 'حافظ على الزخم'
                    : 'Keep the momentum going'}
              </p>
            </div>
          </BlurFade>
        </div>

        {/* ── Stats row ────────────────────────────────────── */}
        <BlurFade delay={0.2}>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile
              label={locale === 'ar' ? 'الإتقان' : 'Mastery'}
              icon={<Brain className="h-3.5 w-3.5" />}
              value={masteryPct}
              suffix="%"
            />
            <StatTile
              label={locale === 'ar' ? 'الدروس' : 'Lessons'}
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              value={snap.completedLessons}
              suffix={`/${snap.totalLessons}`}
            />
            <StatTile
              label={locale === 'ar' ? 'الساعات' : 'Hours'}
              icon={<Clock className="h-3.5 w-3.5" />}
              value={snap.hoursStudied}
              suffix="h"
              decimals={1}
            />
            <StatTile
              label={locale === 'ar' ? 'المرحلة' : 'Phase'}
              icon={<Target className="h-3.5 w-3.5" />}
              value={
                snap.phases.find((p) => p.completed < p.total)?.order ?? snap.phases.length
              }
              suffix={`/${snap.phases.length}`}
            />
          </div>
        </BlurFade>

        {/* ── Today + Phase progress ───────────────────────── */}
        <div className="mt-8 grid gap-4 lg:grid-cols-5">
          <BlurFade delay={0.25} className="lg:col-span-3">
            <div className="h-full rounded-xl border border-border bg-bg-elev p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-fg-muted" />
                  <h3 className="text-sm font-semibold">
                    {locale === 'ar' ? 'خطة اليوم' : "Today's plan"}
                  </h3>
                </div>
                <Badge variant="default">
                  {snap.todayItems.length} {locale === 'ar' ? 'عناصر' : 'items'}
                </Badge>
              </div>

              {snap.todayItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                    {locale === 'ar' ? 'سيتم إنشاؤها صباحًا' : 'Generated each morning'}
                  </p>
                  <p className="mt-2 text-sm text-fg-muted">
                    {locale === 'ar'
                      ? 'لا توجد خطة اليوم بعد'
                      : "No plan yet for today — check back tomorrow."}
                  </p>
                </div>
              ) : (
                <AnimatedList delay={150}>
                  {snap.todayItems.map((item, i) => (
                    <Link
                      key={`${item.lessonSlug}-${i}`}
                      href={`/${locale}/lessons/${item.lessonSlug}`}
                      className="group flex items-center gap-3 rounded-lg border border-border bg-bg p-3 transition-colors hover:border-border-strong hover:bg-bg-overlay"
                    >
                      <KindBadge kind={item.kind} locale={locale} />
                      <span className="flex-1 text-sm font-medium text-fg">
                        {item.lessonTitle}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-fg-subtle transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                    </Link>
                  ))}
                </AnimatedList>
              )}
            </div>
          </BlurFade>

          <BlurFade delay={0.3} className="lg:col-span-2">
            <div className="h-full rounded-xl border border-border bg-bg-elev p-6">
              <div className="mb-5 flex items-center gap-2">
                <Target className="h-4 w-4 text-fg-muted" />
                <h3 className="text-sm font-semibold">
                  {locale === 'ar' ? 'تقدم المراحل' : 'Phase progress'}
                </h3>
              </div>

              <div className="space-y-3">
                {snap.phases.map((p) => {
                  const pct = p.total > 0 ? (p.completed / p.total) * 100 : 0
                  const isCurrent = p.completed < p.total && p.completed > 0
                  const isDone = p.completed === p.total && p.total > 0
                  return (
                    <div key={p.order} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex h-4 w-4 items-center justify-center rounded-full font-mono text-[9px] font-bold',
                              isDone
                                ? 'bg-success/20 text-success'
                                : isCurrent
                                  ? 'bg-accent text-accent-fg'
                                  : 'bg-bg-overlay text-fg-subtle',
                            )}
                          >
                            {isDone ? '✓' : p.order}
                          </span>
                          <span
                            className={cn(
                              'font-medium',
                              isCurrent ? 'text-fg' : 'text-fg-muted',
                            )}
                          >
                            {locale === 'ar' ? p.titleAr : p.titleEn}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] text-fg-subtle tabular">
                          {p.completed}/{p.total}
                        </span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-bg-overlay">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-700',
                            isDone ? 'bg-success' : 'bg-accent',
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </BlurFade>
        </div>
      </main>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────

function StatTile({
  label,
  icon,
  value,
  suffix = '',
  decimals = 0,
}: {
  label: string
  icon: React.ReactNode
  value: number
  suffix?: string
  decimals?: number
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-elev p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          {label}
        </span>
        <span className="text-fg-subtle">{icon}</span>
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <NumberTicker
          value={value}
          decimalPlaces={decimals}
          className="font-mono text-3xl font-medium tracking-tight"
        />
        <span className="font-mono text-sm text-fg-subtle">{suffix}</span>
      </div>
    </div>
  )
}

function KindBadge({
  kind,
  locale,
}: {
  kind: 'review' | 'weak' | 'new'
  locale: 'en' | 'ar'
}) {
  const map = {
    review: {
      label: locale === 'ar' ? 'مراجعة' : 'Review',
      cls: 'bg-warning/15 text-warning border-warning/30',
    },
    weak: {
      label: locale === 'ar' ? 'ضعف' : 'Weak',
      cls: 'bg-danger/15 text-danger border-danger/30',
    },
    new: {
      label: locale === 'ar' ? 'جديد' : 'New',
      cls: 'bg-accent-soft text-accent border-accent/30',
    },
  } as const
  const m = map[kind]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider',
        m.cls,
      )}
    >
      {m.label}
    </span>
  )
}
