import type { ModuleStrength } from '@/lib/learning-curves/insights'
import { Crown, TrendingDown } from 'lucide-react'

/**
 * Top-5 / Bottom-5 module mastery side-by-side. Tells a recruiter at a
 * glance "they're solid on Audit + GST, still weak on TDS + Cash Flow."
 */
export function SubjectStrengthList({
  top,
  bottom,
  locale,
  labels,
}: {
  top: ModuleStrength[]
  bottom: ModuleStrength[]
  locale: 'en' | 'ar'
  labels: { strongest: string; weakest: string; mastery: string; lessons: string }
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card
        eyebrow={labels.strongest}
        icon={<Crown className="h-3.5 w-3.5 text-success" />}
        items={top}
        locale={locale}
        labels={labels}
        tone="success"
      />
      <Card
        eyebrow={labels.weakest}
        icon={<TrendingDown className="h-3.5 w-3.5 text-warning" />}
        items={bottom}
        locale={locale}
        labels={labels}
        tone="warning"
      />
    </div>
  )
}

function Card({
  eyebrow,
  icon,
  items,
  locale,
  labels,
  tone,
}: {
  eyebrow: string
  icon: React.ReactNode
  items: ModuleStrength[]
  locale: 'en' | 'ar'
  labels: { mastery: string; lessons: string }
  tone: 'success' | 'warning'
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-elev/40 p-5">
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        {icon}
        {eyebrow}
      </p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-fg-subtle">—</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {items.map((m) => {
            const title = locale === 'ar' ? m.titleAr : m.titleEn
            const pct = Math.round(m.masteryAvg * 100)
            return (
              <li key={m.moduleId}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium text-fg">{title}</span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-fg-muted">
                    {pct}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg">
                  <div
                    className={
                      tone === 'success'
                        ? 'h-full rounded-full bg-success'
                        : 'h-full rounded-full bg-warning'
                    }
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 font-mono text-[10px] text-fg-subtle">
                  {m.lessonsTouched}/{m.lessonsTotal} {labels.lessons}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
