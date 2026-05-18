import { AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const COPY = {
  en: {
    missed: (n: number) =>
      n === 1 ? 'You missed 1 day this week.' : `You missed ${n} days this week.`,
    catchUp: 'Catch up',
    behindBlurb: 'Your plan was re-paced to fit your remaining time.',
    behindSeverely: "Let's get back on track — start with today's plan.",
  },
  ar: {
    missed: (n: number) =>
      n === 1 ? 'فاتك يوم واحد هذا الأسبوع.' : `فاتتك ${n} أيام هذا الأسبوع.`,
    catchUp: 'استدراك',
    behindBlurb: 'تمت إعادة جدولة خطتك لتناسب الوقت المتبقي.',
    behindSeverely: 'لنرجع إلى المسار — ابدأ بخطة اليوم.',
  },
} as const

type Props = {
  missedDays: number
  locale: 'en' | 'ar'
}

export function MissedDaysBanner({ missedDays, locale }: Props) {
  if (missedDays < 1) return null
  const t = COPY[locale]
  const severe = missedDays >= 3

  return (
    <Link
      href={`/${locale}/assignments/today`}
      className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/40 bg-warning/5 px-4 py-3 transition-colors hover:border-warning/70 hover:bg-warning/10"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-warning/40 bg-warning/15 text-warning">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-warning">
            {t.missed(missedDays)}
          </p>
          <p className="text-sm font-medium text-fg">{severe ? t.behindSeverely : t.behindBlurb}</p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-warning">
        {t.catchUp}
        <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
      </span>
    </Link>
  )
}
