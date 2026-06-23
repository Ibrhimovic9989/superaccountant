import type { MasteryDistribution } from '@/lib/learning-curves/insights'

/**
 * Four-segment mastery donut: mastered / proficient / weak / untouched.
 * Answers "how far am I through the curve" in a single glance.
 *
 * Server-only SVG. Arcs computed analytically — no JS chart library.
 */
export function MasteryDistributionDonut({
  d,
  labels,
}: {
  d: MasteryDistribution
  labels: {
    eyebrow: string
    mastered: string
    proficient: string
    weak: string
    untouched: string
    center: (mastered: number, total: number) => string
    centerSub: string
  }
}) {
  const segments = [
    { key: 'mastered', value: d.mastered, color: 'var(--success)', label: labels.mastered },
    { key: 'proficient', value: d.proficient, color: 'var(--accent)', label: labels.proficient },
    { key: 'weak', value: d.weak, color: 'var(--warning)', label: labels.weak },
    { key: 'untouched', value: d.untouched, color: 'var(--border)', label: labels.untouched },
  ]
  const total = Math.max(1, d.total)

  const size = 160
  const cx = size / 2
  const cy = size / 2
  const rOuter = 70
  const rInner = 46

  let cursor = -Math.PI / 2 // start at 12 o'clock
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const angle = (s.value / total) * Math.PI * 2
      const start = cursor
      const end = cursor + angle
      cursor = end
      return { ...s, start, end, angle }
    })

  return (
    <div className="rounded-2xl border border-border bg-bg-elev/40 p-5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        {labels.eyebrow}
      </p>
      <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="relative shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Mastery distribution">
            <title>Mastery distribution across the curriculum</title>
            {arcs.length === 0 ? (
              <circle
                cx={cx}
                cy={cy}
                r={(rOuter + rInner) / 2}
                fill="none"
                stroke="var(--border)"
                strokeWidth={rOuter - rInner}
              />
            ) : (
              arcs.map((a) => (
                <path
                  key={a.key}
                  d={ringSlice(cx, cy, rInner, rOuter, a.start, a.end)}
                  fill={a.color}
                />
              ))
            )}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-semibold text-xl leading-none tracking-tight">
              {labels.center(d.mastered, d.total)}
            </span>
            <span className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {labels.centerSub}
            </span>
          </div>
        </div>

        <ul className="flex-1 space-y-1.5 text-sm">
          {segments.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-fg-muted">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-fg">
                {s.value}
                <span className="ms-1 text-fg-subtle">
                  · {total === 0 ? 0 : Math.round((s.value / total) * 100)}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * SVG path for a donut slice (ring annulus segment) from `start` to `end`
 * angle in radians, with inner radius `rIn` and outer `rOut`.
 */
function ringSlice(cx: number, cy: number, rIn: number, rOut: number, start: number, end: number): string {
  // For a near-full circle we still need two arcs (large-arc-flag handles
  // it), but esp. close to 2π we nudge the end slightly to avoid the
  // SVG arc degeneracy where start == end renders as nothing.
  const sweep = end - start
  const largeArc = sweep > Math.PI ? 1 : 0
  const xOuterStart = cx + rOut * Math.cos(start)
  const yOuterStart = cy + rOut * Math.sin(start)
  const xOuterEnd = cx + rOut * Math.cos(end)
  const yOuterEnd = cy + rOut * Math.sin(end)
  const xInnerEnd = cx + rIn * Math.cos(end)
  const yInnerEnd = cy + rIn * Math.sin(end)
  const xInnerStart = cx + rIn * Math.cos(start)
  const yInnerStart = cy + rIn * Math.sin(start)
  return [
    `M ${xOuterStart} ${yOuterStart}`,
    `A ${rOut} ${rOut} 0 ${largeArc} 1 ${xOuterEnd} ${yOuterEnd}`,
    `L ${xInnerEnd} ${yInnerEnd}`,
    `A ${rIn} ${rIn} 0 ${largeArc} 0 ${xInnerStart} ${yInnerStart}`,
    'Z',
  ].join(' ')
}
