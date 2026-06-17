import type { LearningInsights } from '@/lib/learning-curves/insights'
import { Flame, Sparkles, Trophy, RotateCcw } from 'lucide-react'

/**
 * Five "deep insight" cards that sit above the strength list + heatmap.
 *
 * Each card answers exactly one question a recruiter would ask, with a
 * short numeric headline + one descriptive line of context. The values
 * come straight from the insights aggregator; no client-side compute.
 */

type Labels = {
  improvement: { title: string; gain: (pts: number) => string; sub: string; needsData: string }
  discipline: { title: string; active: (d: number) => string; sub: (streak: number) => string; consistencyShort: (pct: number) => string }
  percentile: { title: string; top: (n: number) => string; sub: (cohort: number) => string; needsCohort: (n: number) => string }
  recovery: { title: string; rate: (pct: number) => string; sub: (n: number, total: number) => string; needsData: string }
}

export function InsightCards({
  insights,
  labels,
}: {
  insights: LearningInsights
  labels: Labels
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ImprovementCard insights={insights} labels={labels} />
      <DisciplineCard insights={insights} labels={labels} />
      <PercentileCard insights={insights} labels={labels} />
      <RecoveryCard insights={insights} labels={labels} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────

function ImprovementCard({ insights, labels }: { insights: LearningInsights; labels: Labels }) {
  const { entryScorePct, grandScorePct, deltaPoints } = insights.improvement
  const sufficient = entryScorePct != null && grandScorePct != null && deltaPoints != null
  return (
    <Frame icon={<Sparkles className="h-3.5 w-3.5" />} eyebrow={labels.improvement.title}>
      {sufficient ? (
        <>
          <p className="mt-2 text-2xl font-semibold leading-none tracking-tight">
            <span className={deltaPoints >= 0 ? 'text-success' : 'text-danger'}>
              {deltaPoints >= 0 ? '+' : ''}
              {deltaPoints}
            </span>
            <span className="ml-1 text-sm font-normal text-fg-muted">pts</span>
          </p>
          <p className="mt-1 text-[11px] text-fg-subtle">
            {labels.improvement.gain(deltaPoints)}
          </p>
          <div className="mt-3 flex gap-3 font-mono text-[10px] tabular-nums text-fg-muted">
            <span>entry · {entryScorePct}%</span>
            <span className="text-fg-subtle">→</span>
            <span>grand · {grandScorePct}%</span>
          </div>
        </>
      ) : (
        <NeedsData text={labels.improvement.needsData} />
      )}
    </Frame>
  )
}

function DisciplineCard({ insights, labels }: { insights: LearningInsights; labels: Labels }) {
  const { activeDays, longestStreak, consistencyPct } = insights.discipline
  return (
    <Frame icon={<Flame className="h-3.5 w-3.5" />} eyebrow={labels.discipline.title}>
      <p className="mt-2 text-2xl font-semibold leading-none tracking-tight">
        {activeDays}
        <span className="ml-1 text-sm font-normal text-fg-muted">d</span>
      </p>
      <p className="mt-1 text-[11px] text-fg-subtle">{labels.discipline.active(activeDays)}</p>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] tabular-nums text-fg-muted">
        <span>{labels.discipline.sub(longestStreak)}</span>
        {consistencyPct != null && (
          <span className="text-fg-subtle">{labels.discipline.consistencyShort(consistencyPct)}</span>
        )}
      </div>
    </Frame>
  )
}

function PercentileCard({ insights, labels }: { insights: LearningInsights; labels: Labels }) {
  const { percentile, peersConsidered } = insights.cohortPercentile
  return (
    <Frame icon={<Trophy className="h-3.5 w-3.5" />} eyebrow={labels.percentile.title}>
      {percentile != null ? (
        <>
          <p className="mt-2 text-2xl font-semibold leading-none tracking-tight">
            top {100 - percentile}
            <span className="ml-1 text-sm font-normal text-fg-muted">%</span>
          </p>
          <p className="mt-1 text-[11px] text-fg-subtle">{labels.percentile.top(100 - percentile)}</p>
          <p className="mt-3 font-mono text-[10px] tabular-nums text-fg-muted">
            {labels.percentile.sub(peersConsidered)}
          </p>
        </>
      ) : (
        <NeedsData text={labels.percentile.needsCohort(peersConsidered)} />
      )}
    </Frame>
  )
}

function RecoveryCard({ insights, labels }: { insights: LearningInsights; labels: Labels }) {
  const { rate, initiallyWeak, recovered } = insights.recovery
  return (
    <Frame icon={<RotateCcw className="h-3.5 w-3.5" />} eyebrow={labels.recovery.title}>
      {rate != null ? (
        <>
          <p className="mt-2 text-2xl font-semibold leading-none tracking-tight">
            {Math.round(rate * 100)}
            <span className="ml-1 text-sm font-normal text-fg-muted">%</span>
          </p>
          <p className="mt-1 text-[11px] text-fg-subtle">
            {labels.recovery.rate(Math.round(rate * 100))}
          </p>
          <p className="mt-3 font-mono text-[10px] tabular-nums text-fg-muted">
            {labels.recovery.sub(recovered, initiallyWeak)}
          </p>
        </>
      ) : (
        <NeedsData text={labels.recovery.needsData} />
      )}
    </Frame>
  )
}

// ──────────────────────────────────────────────────────────────

function Frame({
  icon,
  eyebrow,
  children,
}: {
  icon: React.ReactNode
  eyebrow: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-elev/40 p-4">
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        {icon}
        {eyebrow}
      </p>
      {children}
    </div>
  )
}

function NeedsData({ text }: { text: string }) {
  return (
    <>
      <p className="mt-2 text-2xl font-semibold leading-none tracking-tight text-fg-subtle">—</p>
      <p className="mt-1 text-[11px] text-fg-subtle">{text}</p>
    </>
  )
}
