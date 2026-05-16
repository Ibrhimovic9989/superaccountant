import { AppNav } from '@/components/app-nav'
import { LevelRing } from '@/components/gamification/level-ring'
import { StreakLadder } from '@/components/gamification/streak-ladder'
import { XpBar } from '@/components/gamification/xp-bar'
import { AnimatedList } from '@/components/magicui/animated-list'
import { BlurFade } from '@/components/magicui/blur-fade'
import { BorderBeam } from '@/components/magicui/border-beam'
import { MagicCard } from '@/components/magicui/magic-card'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { PageBackdrop } from '@/components/page-backdrop'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GlowCard } from '@/components/ui/glow-card'
import { auth } from '@/lib/auth'
import { getAccessTier, hasFullAccess } from '@/lib/cohort/access'
import { type Badge as AchievementBadge, getAchievements } from '@/lib/data/achievements'
import { getDashboardSnapshot } from '@/lib/data/dashboard'
import { CURRENT_TERMS_VERSION, getUserProfile } from '@/lib/data/profile'
import { computeXp, getLevel } from '@/lib/data/xp'
import { cn } from '@/lib/utils'
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import { Trophy } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function Dashboard({
  params,
}: {
  params: Promise<{ locale: 'en' | 'ar' }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)

  // First-run gate — consent → market → profile → entry test, then dashboard.
  const u = await getUserProfile(session.user.id)
  if (!u?.consentedAt || u.consentedTermsVersion !== CURRENT_TERMS_VERSION) {
    redirect(`/${locale}/welcome/consent`)
  }
  if (!u?.preferredTrack) redirect(`/${locale}/welcome`)
  if (!u.profileCompletedAt) redirect(`/${locale}/welcome/profile`)

  // Cohort gate — preview-tier users get bounced to /cohort to enrol.
  // Admin / staff / paid-cohort flow through.
  const tier = await getAccessTier(session.user.id)
  if (!hasFullAccess(tier)) redirect(`/${locale}/cohort`)

  const [snap, badges] = await Promise.all([
    getDashboardSnapshot(session.user.id),
    getAchievements(session.user.id, u.preferredTrack),
  ])
  const firstName = session.user.name?.split(' ')[0] ?? session.user.email?.split('@')[0] ?? ''
  const trackLabel = snap.market === 'india' ? 'India · Chartered Path' : "KSA · Mu'tamad Path"

  const masteryPct = Math.round(snap.averageMastery * 100)

  // Gamification — derive XP + rank from the snapshot. Pure math, no DB call.
  const earnedBadges = badges.filter((b) => b.earned).length
  const xp = computeXp({
    completedLessons: snap.completedLessons,
    hoursStudied: snap.hoursStudied,
    streakDays: snap.streakDays,
    earnedBadges,
  })
  const lvl = getLevel(xp)
  const rankTitle = locale === 'ar' ? lvl.current.titleAr : lvl.current.titleEn
  const nextRankTitle = lvl.next ? (locale === 'ar' ? lvl.next.titleAr : lvl.next.titleEn) : null

  return (
    <div className="relative min-h-screen bg-bg text-fg">
      <PageBackdrop />
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />

      <main className="relative mx-auto max-w-6xl px-6 py-12">
        {/* ── Cohort access pill ──────────────────────────── */}
        {tier.kind === 'paid-cohort' && (
          <BlurFade delay={0.02}>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-success">
              <CheckCircle2 className="h-3 w-3" />
              Enrolled · {tier.cohortName}
            </div>
          </BlurFade>
        )}
        {(tier.kind === 'admin' || tier.kind === 'staff') && (
          <BlurFade delay={0.02}>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-warning">
              <Sparkles className="h-3 w-3" />
              {tier.kind === 'admin' ? 'Admin' : 'Staff'} · full access
            </div>
          </BlurFade>
        )}

        {/* ── Telemetry strip ───────────────────────────────── */}
        <BlurFade delay={0.04}>
          <div className="mb-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
            <span className="relative inline-flex h-1.5 w-1.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            <span>{trackLabel}</span>
            <span className="text-fg-subtle/40">/</span>
            <span>{rankTitle}</span>
            <span className="text-fg-subtle/40">/</span>
            <span>LVL {lvl.current.level}</span>
            {snap.streakDays > 0 && (
              <>
                <span className="text-fg-subtle/40">/</span>
                <span className="text-accent">{snap.streakDays}D STREAK</span>
              </>
            )}
          </div>
        </BlurFade>

        {/* ── Greeting ─────────────────────────────────────── */}
        <BlurFade delay={0.05}>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {locale === 'ar' ? `أهلاً، ${firstName}.` : `Welcome back, ${firstName}.`}
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            {locale === 'ar'
              ? 'لوحة التحكم جاهزة. اختر مدخلك.'
              : 'System primed. Pick an entry point.'}
          </p>
        </BlurFade>

        {/* ── Level / XP hero strip ────────────────────────── */}
        <BlurFade delay={0.08}>
          <GlowCard className="relative mt-8 rounded-2xl">
            <div className="flex items-center gap-5 px-5 py-5 sm:gap-7 sm:px-7 sm:py-6">
              <LevelRing level={lvl.current.level} progress={lvl.progressToNext} size={104} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
                    Rank
                  </span>
                  <span className="text-fg-subtle/40">·</span>
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{rankTitle}</h2>
                </div>
                <div className="mt-2 flex items-baseline gap-2 font-mono">
                  <NumberTicker
                    value={lvl.xp}
                    className="text-3xl font-medium tracking-tight tabular-nums"
                  />
                  <span className="text-xs uppercase tracking-[0.2em] text-fg-subtle">XP</span>
                  {lvl.next && (
                    <span className="ms-auto text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
                      <span className="text-accent tabular-nums">
                        {lvl.xpForLevel - lvl.xpIntoLevel}
                      </span>{' '}
                      → {nextRankTitle}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <XpBar progress={lvl.progressToNext} />
                </div>
              </div>
            </div>
            <BorderBeam
              size={70}
              duration={10}
              colorFrom="#a78bfa"
              colorTo="#22d3ee"
              className="opacity-70"
            />
          </GlowCard>
        </BlurFade>

        {/* ── Continue + Streak ────────────────────────────── */}
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <BlurFade delay={0.1} className="lg:col-span-2">
            {snap.resume ? (
              <MagicCard className="h-full rounded-xl">
                <div className="relative flex h-full flex-col gap-5 p-6 sm:p-8">
                  <div className="flex items-start justify-between">
                    <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
                      <span className="relative inline-flex h-1.5 w-1.5 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                      </span>
                      {locale === 'ar' ? 'الجلسة الحالية' : 'Active session'}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
                      <span className="text-accent tabular-nums">
                        {Math.round(snap.resume.mastery * 100)}
                      </span>
                      % {locale === 'ar' ? 'إتقان' : 'mastery'}
                    </span>
                  </div>

                  <h2 className="text-2xl font-semibold leading-[1.1] tracking-tight sm:text-3xl">
                    {locale === 'ar' ? snap.resume.titleAr : snap.resume.titleEn}
                  </h2>

                  <div className="h-px w-full overflow-hidden bg-bg-overlay">
                    <div
                      className="h-full transition-all duration-1000"
                      style={{
                        width: `${Math.max(snap.resume.mastery * 100, 4)}%`,
                        background:
                          'linear-gradient(90deg, transparent, var(--accent) 20%, var(--accent) 80%, transparent)',
                        boxShadow: '0 0 8px var(--accent)',
                      }}
                    />
                  </div>

                  <div className="mt-auto flex items-center gap-3">
                    <Button asChild variant="accent" size="lg" className="relative overflow-hidden">
                      <Link href={`/${locale}/lessons/${snap.resume.slug}`}>
                        {locale === 'ar' ? 'استئناف' : 'Resume'}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                        <BorderBeam size={48} duration={5} colorFrom="#a78bfa" colorTo="#22d3ee" />
                      </Link>
                    </Button>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
                      ⌘ ↵
                    </span>
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
            <div className="relative h-full overflow-hidden lift rounded-xl border border-border bg-bg-elev p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                  {locale === 'ar' ? 'سلسلة' : 'Streak'}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  {snap.streakDays === 0
                    ? locale === 'ar'
                      ? 'ابدأ اليوم'
                      : 'Start today'
                    : locale === 'ar'
                      ? 'استمر'
                      : 'Keep going'}
                </span>
              </div>
              <StreakLadder days={snap.streakDays} locale={locale} />
            </div>
          </BlurFade>
        </div>

        {/* ── Stats row — sleek mono telemetry ──────────────── */}
        <BlurFade delay={0.2}>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              value={snap.phases.find((p) => p.completed < p.total)?.order ?? snap.phases.length}
              suffix={`/${snap.phases.length}`}
            />
          </div>
        </BlurFade>

        {/* ── Today + Phase progress ───────────────────────── */}
        <div className="mt-8 grid gap-4 lg:grid-cols-5">
          <BlurFade delay={0.25} className="lg:col-span-3">
            <div className="h-full lift rounded-xl border border-border bg-bg-elev p-6">
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
                      : 'No plan yet for today — check back tomorrow.'}
                  </p>
                </div>
              ) : (
                <AnimatedList delay={150}>
                  {snap.todayItems.map((item, i) => {
                    // Reward varies by kind so review is small, new is big.
                    const xpReward = item.kind === 'new' ? 100 : item.kind === 'weak' ? 80 : 50
                    return (
                      <Link
                        key={`${item.lessonSlug}-${i}`}
                        href={`/${locale}/lessons/${item.lessonSlug}`}
                        className="group relative flex items-center gap-3 overflow-hidden rounded-lg border border-border bg-bg p-3 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:bg-bg-overlay hover:shadow-[0_8px_20px_-12px_rgba(139,92,246,0.4)]"
                      >
                        <KindBadge kind={item.kind} locale={locale} />
                        <span className="flex-1 text-sm font-medium text-fg">
                          {item.lessonTitle}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent-soft/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent">
                          <Zap className="h-2.5 w-2.5" />+{xpReward} XP
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-fg-subtle transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                      </Link>
                    )
                  })}
                </AnimatedList>
              )}
            </div>
          </BlurFade>

          <BlurFade delay={0.3} className="lg:col-span-2">
            <div className="h-full lift rounded-xl border border-border bg-bg-elev p-6">
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
                            className={cn('font-medium', isCurrent ? 'text-fg' : 'text-fg-muted')}
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

        {/* ── Achievements ─────────────────────────────────── */}
        <BlurFade delay={0.35}>
          <div className="mt-8 lift rounded-xl border border-border bg-bg-elev p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-fg-muted" />
                <h3 className="text-sm font-semibold">
                  {locale === 'ar' ? 'الإنجازات' : 'Achievements'}
                </h3>
              </div>
              <Badge variant="default">
                {badges.filter((b) => b.earned).length}/{badges.length}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {badges.map((badge, i) => (
                <AchievementTile key={badge.id} badge={badge} locale={locale} idx={i} />
              ))}
            </div>
          </div>
        </BlurFade>
      </main>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────

function AchievementTile({
  badge,
  locale,
  idx,
}: {
  badge: AchievementBadge
  locale: 'en' | 'ar'
  idx: number
}) {
  const name = locale === 'ar' ? badge.nameAr : badge.nameEn
  const desc = locale === 'ar' ? badge.descAr : badge.descEn
  // Subtle index-based jitter on the accent hue, so the grid has rhythm
  // without going rainbow. Hue range: violet (-15°) → cyan (+30°).
  const hue = (idx * 13) % 45
  return (
    <div
      title={`${name} — ${desc}`}
      className={cn(
        'group relative flex aspect-square flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border text-center transition-all duration-300',
        badge.earned
          ? 'border-accent/40 bg-bg-elev/70 backdrop-blur-sm hover:-translate-y-0.5 hover:border-accent/80'
          : 'border-border bg-bg-elev/30 hover:border-border-strong',
      )}
      style={
        badge.earned
          ? {
              boxShadow:
                'inset 0 0 0 1px color-mix(in oklab, var(--accent) 18%, transparent), 0 0 30px -8px color-mix(in oklab, var(--accent) 40%, transparent)',
              filter: `hue-rotate(${hue - 15}deg)`,
            }
          : undefined
      }
    >
      {/* Faint corner crosshairs — telemetry frame on earned tiles */}
      {badge.earned && (
        <>
          <span aria-hidden className="absolute left-1.5 top-1.5 h-2 w-px bg-accent/50" />
          <span aria-hidden className="absolute left-1.5 top-1.5 h-px w-2 bg-accent/50" />
          <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-px bg-accent/50" />
          <span aria-hidden className="absolute right-1.5 top-1.5 h-px w-2 bg-accent/50" />
          <span aria-hidden className="absolute bottom-1.5 left-1.5 h-2 w-px bg-accent/50" />
          <span aria-hidden className="absolute bottom-1.5 left-1.5 h-px w-2 bg-accent/50" />
          <span aria-hidden className="absolute bottom-1.5 right-1.5 h-2 w-px bg-accent/50" />
          <span aria-hidden className="absolute bottom-1.5 right-1.5 h-px w-2 bg-accent/50" />
        </>
      )}
      <span
        className={cn(
          'text-2xl transition-transform duration-300 group-hover:scale-110',
          !badge.earned && 'opacity-30 grayscale',
        )}
      >
        {badge.emoji}
      </span>
      <span
        className={cn(
          'px-2 text-[10px] font-medium leading-tight',
          badge.earned ? 'text-fg' : 'text-fg-subtle',
        )}
      >
        {name}
      </span>
      {!badge.earned && badge.progress > 0 && (
        <div className="absolute inset-x-2 bottom-2 h-px overflow-hidden bg-bg-overlay">
          <div
            className="h-full bg-accent transition-all duration-700"
            style={{ width: `${Math.round(badge.progress * 100)}%` }}
          />
        </div>
      )}
      {/* Hover-reveal description (earned tiles only) */}
      {badge.earned && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-bg-overlay/95 px-2 py-1.5 text-[9px] leading-snug text-fg-muted opacity-0 backdrop-blur transition-all duration-200 group-hover:-translate-y-0 group-hover:opacity-100">
          {desc}
        </div>
      )}
    </div>
  )
}

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
    <GlowCard className="rounded-xl">
      <div className="relative px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
            {label}
          </span>
          <span className="text-fg-subtle transition-colors duration-300 group-hover:text-accent">
            {icon}
          </span>
        </div>
        <div className="mt-5 flex items-baseline gap-1.5">
          <NumberTicker
            value={value}
            decimalPlaces={decimals}
            className="font-mono text-3xl font-medium tracking-tight tabular-nums"
          />
          <span className="font-mono text-xs text-fg-subtle">{suffix}</span>
        </div>
        {/* Bottom accent line — fills on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-4 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-transparent via-accent to-transparent transition-transform duration-500 group-hover:scale-x-100"
        />
      </div>
    </GlowCard>
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
