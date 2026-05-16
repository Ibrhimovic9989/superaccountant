import { AppNav } from '@/components/app-nav'
import { DailyVibe } from '@/components/gamification/daily-vibe'
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

        {/* ── Greeting ─────────────────────────────────────── */}
        <BlurFade delay={0.05}>
          <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
            {trackLabel}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {locale === 'ar' ? `مرحبًا، ${firstName} 👋` : `Hey ${firstName}, ready to roll? 👋`}
          </h1>
        </BlurFade>

        {/* ── Daily vibe — the eye-catcher ─────────────────── */}
        <BlurFade delay={0.08}>
          <div className="mt-6">
            <DailyVibe
              streakDays={snap.streakDays}
              level={lvl.current.level}
              rankTitle={rankTitle}
              xp={lvl.xp}
              locale={locale}
            />
          </div>
        </BlurFade>

        {/* ── Level / XP hero strip ────────────────────────── */}
        <BlurFade delay={0.08}>
          <div className="lift relative mt-8 overflow-hidden rounded-2xl border border-border bg-bg-elev p-5 sm:p-6">
            <div className="flex items-center gap-5 sm:gap-7">
              <LevelRing level={lvl.current.level} progress={lvl.progressToNext} size={104} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{rankTitle}</h2>
                  <span className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                    <Zap className="h-3 w-3" />
                    <NumberTicker value={lvl.xp} className="tabular-nums" /> XP
                  </span>
                </div>
                <p className="mt-1 text-xs text-fg-muted">
                  {lvl.next ? (
                    <>
                      {lvl.xpForLevel - lvl.xpIntoLevel} XP {locale === 'ar' ? 'إلى رتبة' : 'to'}{' '}
                      <strong className="text-fg">{nextRankTitle}</strong>
                    </>
                  ) : locale === 'ar' ? (
                    'بلغت أعلى رتبة. أحسنت.'
                  ) : (
                    'Top rank achieved. Well done.'
                  )}
                </p>
                <div className="mt-3">
                  <XpBar progress={lvl.progressToNext} />
                </div>
              </div>
            </div>
            <BorderBeam
              size={80}
              duration={9}
              colorFrom="#a78bfa"
              colorTo="#7c3aed"
              className="opacity-60"
            />
          </div>
        </BlurFade>

        {/* ── Continue + Streak ────────────────────────────── */}
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <BlurFade delay={0.1} className="lg:col-span-2">
            {snap.resume ? (
              <MagicCard className="h-full rounded-xl">
                <div className="relative flex h-full flex-col gap-6 overflow-hidden p-6 sm:p-8">
                  {/* Layered colour wash on the card background — pink → violet
                      bleed in from the top-left corner so the card feels
                      alive without overwhelming the lesson title. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full opacity-30 blur-3xl"
                    style={{ background: 'radial-gradient(closest-side, #f472b6, transparent)' }}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-16 -bottom-20 h-72 w-72 rounded-full opacity-25 blur-3xl"
                    style={{ background: 'radial-gradient(closest-side, #a78bfa, transparent)' }}
                  />

                  <div className="relative flex items-start justify-between">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1">
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                      <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
                        {locale === 'ar' ? '▶ تابع من حيث توقفت' : '▶ Pick up where you left off'}
                      </span>
                    </div>
                    <Badge variant="accent">
                      {Math.round(snap.resume.mastery * 100)}%{' '}
                      {locale === 'ar' ? 'إتقان' : 'mastery'}
                    </Badge>
                  </div>

                  <h2 className="relative text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
                    {locale === 'ar' ? snap.resume.titleAr : snap.resume.titleEn}
                  </h2>

                  <div className="relative space-y-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-overlay">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.max(snap.resume.mastery * 100, 4)}%`,
                          background: 'linear-gradient(90deg, #a78bfa 0%, #f472b6 100%)',
                          boxShadow: '0 0 12px rgba(167,139,250,0.6)',
                        }}
                      />
                    </div>
                  </div>

                  <div className="relative mt-auto flex items-center gap-3">
                    <Button asChild variant="accent" size="lg" className="relative overflow-hidden">
                      <Link href={`/${locale}/lessons/${snap.resume.slug}`}>
                        {locale === 'ar' ? 'ابدأ الجلسة' : "Let's go"}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                        <BorderBeam size={56} duration={5} colorFrom="#f472b6" colorTo="#a78bfa" />
                      </Link>
                    </Button>
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

        {/* ── Stats row — each tile with its own world ─────── */}
        <BlurFade delay={0.2}>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile
              label={locale === 'ar' ? 'الإتقان' : 'Mastery'}
              icon={<Brain className="h-4 w-4" />}
              value={masteryPct}
              suffix="%"
              color="#a78bfa"
              emoji="🧠"
            />
            <StatTile
              label={locale === 'ar' ? 'الدروس' : 'Lessons'}
              icon={<CheckCircle2 className="h-4 w-4" />}
              value={snap.completedLessons}
              suffix={`/${snap.totalLessons}`}
              color="#10b981"
              emoji="✅"
            />
            <StatTile
              label={locale === 'ar' ? 'الساعات' : 'Hours'}
              icon={<Clock className="h-4 w-4" />}
              value={snap.hoursStudied}
              suffix="h"
              decimals={1}
              color="#38bdf8"
              emoji="⏱️"
            />
            <StatTile
              label={locale === 'ar' ? 'المرحلة' : 'Phase'}
              icon={<Target className="h-4 w-4" />}
              value={snap.phases.find((p) => p.completed < p.total)?.order ?? snap.phases.length}
              suffix={`/${snap.phases.length}`}
              color="#f472b6"
              emoji="🎯"
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

const BADGE_COLORS = ['#a78bfa', '#38bdf8', '#10b981', '#fbbf24', '#22d3ee', '#f472b6'] as const

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
  const color = BADGE_COLORS[idx % BADGE_COLORS.length] ?? '#a78bfa'
  // Earned stickers get a slight random-ish rotation so the grid feels
  // hand-placed, not a CSS grid of identical squares.
  const tilt = badge.earned ? (idx % 4 === 0 ? -3 : idx % 4 === 1 ? 2 : idx % 4 === 2 ? -1 : 3) : 0
  return (
    <div
      title={`${name} — ${desc}`}
      className={cn(
        'group relative flex aspect-square flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border-2 p-3 text-center transition-all duration-300',
        badge.earned
          ? 'hover:-translate-y-1 hover:rotate-0 hover:scale-105'
          : 'border-border bg-bg-elev/40 hover:-translate-y-0.5 hover:border-border-strong',
      )}
      style={
        badge.earned
          ? {
              transform: `rotate(${tilt}deg)`,
              borderColor: `${color}88`,
              background: `radial-gradient(circle at 30% 20%, ${color}55, ${color}11 70%), var(--bg-elev)`,
              boxShadow: `inset 0 0 0 1px ${color}33, 0 8px 22px -10px ${color}AA, 0 2px 4px rgba(0,0,0,0.06)`,
            }
          : undefined
      }
    >
      <span
        className={cn(
          'text-3xl drop-shadow-sm transition-transform duration-300 group-hover:scale-125',
          !badge.earned && 'opacity-30 grayscale',
        )}
      >
        {badge.emoji}
      </span>
      <span
        className={cn('text-[10px] font-medium leading-tight', !badge.earned && 'text-fg-subtle')}
        style={badge.earned ? { color } : undefined}
      >
        {name}
      </span>
      {!badge.earned && badge.progress > 0 && (
        <div className="absolute inset-x-2 bottom-2 h-0.5 overflow-hidden rounded-full bg-bg-overlay">
          <div
            className="h-full rounded-full bg-accent transition-all duration-700"
            style={{ width: `${Math.round(badge.progress * 100)}%` }}
          />
        </div>
      )}
      {badge.earned && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-1/4 top-1 h-px"
          style={{ background: `linear-gradient(to right, transparent, ${color}66, transparent)` }}
        />
      )}
      {/* Hover-reveal description (earned tiles only) */}
      {badge.earned && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-bg-overlay/95 p-2 text-[9px] leading-snug text-fg-muted opacity-0 backdrop-blur transition-all duration-200 group-hover:-translate-y-0 group-hover:opacity-100">
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
  color,
  emoji,
}: {
  label: string
  icon: React.ReactNode
  value: number
  suffix?: string
  decimals?: number
  color: string
  emoji: string
}) {
  return (
    <div
      className="lift group relative overflow-hidden rounded-2xl border-2 p-5 transition-all hover:-translate-y-1"
      style={{
        borderColor: `${color}33`,
        background: `linear-gradient(135deg, ${color}14 0%, transparent 60%), var(--bg-elev)`,
        boxShadow: `inset 0 0 0 1px ${color}1A, 0 6px 20px -10px ${color}40`,
      }}
    >
      {/* Big background emoji — decorative, drifts on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-3 -right-2 text-6xl opacity-20 transition-all duration-500 group-hover:-translate-y-1 group-hover:rotate-6 group-hover:opacity-30"
      >
        {emoji}
      </span>

      <div className="relative flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color }}>
          {label}
        </span>
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg transition-transform group-hover:rotate-12 group-hover:scale-110"
          style={{ background: `${color}22`, color }}
        >
          {icon}
        </span>
      </div>
      <div className="relative mt-4 flex items-baseline gap-1">
        <NumberTicker
          value={value}
          decimalPlaces={decimals}
          className="font-mono text-3xl font-semibold tracking-tight"
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
