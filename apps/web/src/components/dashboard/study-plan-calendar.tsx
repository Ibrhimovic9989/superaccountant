import { Button } from '@/components/ui/button'
import type { StudyDay, StudyPlanSnapshot } from '@/lib/data/study-plan'
import { cn } from '@/lib/utils'
import { ArrowRight, CalendarDays, CheckCircle2, Circle, Clock, Target, X } from 'lucide-react'
import Link from 'next/link'

const COPY = {
  en: {
    title: 'Study plan',
    twoWeek: 'Two-week view',
    examIn: (n: number) => (n === 1 ? '1 day to exam' : `${n} days to exam`),
    noExam: 'No exam date set',
    setExam: 'Set exam date',
    hoursTarget: (h: number) => `${h}h/week target`,
    paceAhead: 'Ahead of pace',
    paceOnTrack: 'On track',
    paceBehind: 'Behind pace',
    paceUnknown: 'No pace yet',
    today: 'Today',
    openToday: "Open today's plan",
    todayDone: "Today's plan complete",
  },
  ar: {
    title: 'خطة الدراسة',
    twoWeek: 'عرض أسبوعين',
    examIn: (n: number) => (n === 1 ? 'يوم واحد للامتحان' : `${n} يومًا للامتحان`),
    noExam: 'لم يتم تحديد موعد الامتحان',
    setExam: 'حدد موعد الامتحان',
    hoursTarget: (h: number) => `الهدف ${h} ساعة/أسبوع`,
    paceAhead: 'متقدم عن الخطة',
    paceOnTrack: 'في الموعد',
    paceBehind: 'متأخر',
    paceUnknown: 'لا توجد بيانات بعد',
    today: 'اليوم',
    openToday: 'افتح خطة اليوم',
    todayDone: 'خطة اليوم مكتملة',
  },
} as const

const PACE_META = {
  ahead: {
    dot: 'bg-success',
    text: 'text-success',
    border: 'border-success/30',
    bg: 'bg-success/10',
  },
  'on-track': {
    dot: 'bg-accent',
    text: 'text-accent',
    border: 'border-accent/30',
    bg: 'bg-accent-soft',
  },
  behind: { dot: 'bg-danger', text: 'text-danger', border: 'border-danger/30', bg: 'bg-danger/10' },
  unknown: {
    dot: 'bg-fg-subtle',
    text: 'text-fg-subtle',
    border: 'border-border',
    bg: 'bg-bg-overlay',
  },
} as const

type Props = {
  plan: StudyPlanSnapshot
  locale: 'en' | 'ar'
}

export function StudyPlanCalendar({ plan, locale }: Props) {
  const t = COPY[locale]
  const paceLabel =
    plan.pace === 'ahead'
      ? t.paceAhead
      : plan.pace === 'on-track'
        ? t.paceOnTrack
        : plan.pace === 'behind'
          ? t.paceBehind
          : t.paceUnknown
  const paceMeta = PACE_META[plan.pace]

  return (
    <div className="lift rounded-xl border border-border bg-bg-elev p-6">
      {/* ── Header row ─────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-fg-muted" />
          <h3 className="text-sm font-semibold">{t.title}</h3>
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            · {t.twoWeek}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pace pill */}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider',
              paceMeta.border,
              paceMeta.bg,
              paceMeta.text,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', paceMeta.dot)} />
            {paceLabel}
          </span>

          {/* Days-to-exam pill */}
          {plan.daysToExam !== null ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              <Target className="h-3 w-3" />
              {t.examIn(plan.daysToExam)}
            </span>
          ) : (
            <Link
              href={`/${locale}/profile`}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border bg-bg px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted transition-colors hover:border-accent/60 hover:text-accent"
            >
              <Target className="h-3 w-3" />
              {t.setExam}
            </Link>
          )}

          {/* Hours-per-week pill */}
          {plan.hoursPerWeek ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              <Clock className="h-3 w-3" />
              {t.hoursTarget(plan.hoursPerWeek)}
            </span>
          ) : null}
        </div>
      </div>

      {/* ── 14-day strip — two rows of seven (past week / week ahead) ─── */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-7 gap-1.5">
          {plan.days.slice(0, 7).map((d) => (
            <DayCell key={d.isoDate} day={d} locale={locale} />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {plan.days.slice(7).map((d) => (
            <DayCell key={d.isoDate} day={d} locale={locale} />
          ))}
        </div>
      </div>

      {/* ── Today CTA ──────────────────────────────── */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <Legend locale={locale} />
        {plan.todayDone ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t.todayDone}
          </span>
        ) : (
          <Button asChild variant="accent" size="sm">
            <Link href={`/${locale}/assignments/today`}>
              {t.openToday}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────

function DayCell({ day, locale }: { day: StudyDay; locale: 'en' | 'ar' }) {
  const weekday = locale === 'ar' ? day.weekdayShortAr : day.weekdayShortEn

  // Status → visual treatment
  const isDone = day.status === 'done'
  const isPartial = day.status === 'partial'
  const isMissed = day.status === 'missed'
  const isPending = day.status === 'pending'
  const isUpcoming = day.status === 'upcoming'

  return (
    <div
      className={cn(
        'group relative flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-center transition-all',
        isDone && 'border-success/40 bg-success/10 text-success',
        isPartial && 'border-warning/40 bg-warning/10 text-warning',
        isMissed && 'border-danger/30 bg-danger/5 text-danger',
        isPending && 'border-accent/50 bg-accent-soft/60 text-accent',
        isUpcoming && 'border-border bg-bg-overlay/40 text-fg-subtle',
        day.isToday && 'ring-1 ring-accent/60 ring-offset-1 ring-offset-bg-elev',
      )}
      title={day.isoDate}
    >
      <span className="font-mono text-[9px] uppercase tracking-wider leading-none">
        {day.isToday ? (locale === 'ar' ? 'اليوم' : 'Today') : weekday}
      </span>
      <span className="font-mono text-base font-semibold tabular-nums leading-none">
        {day.dayOfMonth}
      </span>
      <StatusMark status={day.status} />
      {day.itemCount > 0 && !isMissed ? (
        <span className="font-mono text-[8px] tabular-nums leading-none">{day.itemCount}×</span>
      ) : null}
    </div>
  )
}

function StatusMark({ status }: { status: StudyDay['status'] }) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="h-3 w-3" />
    case 'partial':
      return <Circle className="h-3 w-3" />
    case 'missed':
      return <X className="h-3 w-3" />
    case 'pending':
      return (
        <span className="relative inline-flex h-2 w-2 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
      )
    case 'upcoming':
      return <span className="h-1 w-1 rounded-full bg-fg-subtle/40" />
  }
}

function Legend({ locale }: { locale: 'en' | 'ar' }) {
  const items =
    locale === 'ar'
      ? [
          { color: 'bg-success', label: 'مكتمل' },
          { color: 'bg-warning', label: 'جزئي' },
          { color: 'bg-danger', label: 'فائت' },
          { color: 'bg-accent', label: 'اليوم' },
        ]
      : [
          { color: 'bg-success', label: 'Done' },
          { color: 'bg-warning', label: 'Partial' },
          { color: 'bg-danger', label: 'Missed' },
          { color: 'bg-accent', label: 'Today' },
        ]
  return (
    <div className="hidden flex-wrap items-center gap-3 font-mono text-[9px] uppercase tracking-wider text-fg-subtle sm:flex">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 rounded-full', i.color)} />
          {i.label}
        </span>
      ))}
    </div>
  )
}
