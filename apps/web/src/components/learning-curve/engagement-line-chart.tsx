import type { DailyEngagement } from '@/lib/learning-curves/insights'

/**
 * Cumulative-lessons-engaged trajectory over the last 60 days. Reads
 * as "the shape of the journey" — steep early-ramp vs steady-climb vs
 * plateau-then-spike-before-grand all look visually distinct.
 *
 * Server-only SVG. Axis ticks come straight from the data length so
 * the same component scales if HEATMAP_DAYS in insights.ts changes.
 */
export function EngagementLineChart({
  data,
  labels,
}: {
  data: DailyEngagement[]
  labels: { eyebrow: string; yLabel: string; today: string; start: string }
}) {
  const W = 600
  const H = 200
  const PAD_L = 36
  const PAD_R = 12
  const PAD_T = 14
  const PAD_B = 30
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const max = Math.max(1, ...data.map((d) => d.cumulativeLessons))
  // Round the y-axis to a nice ceiling so the gridlines aren't ugly.
  const yCeil = niceCeiling(max)
  const yFor = (v: number) => PAD_T + innerH - (v / yCeil) * innerH
  const xFor = (i: number) =>
    PAD_L + (data.length <= 1 ? 0 : (i / (data.length - 1)) * innerW)

  const linePts = data.map((d, i) => `${xFor(i)},${yFor(d.cumulativeLessons)}`).join(' ')
  // Filled area underneath the line — gives the chart visual weight.
  const areaPath =
    data.length === 0
      ? ''
      : [
          `M ${xFor(0)},${yFor(0)}`,
          ...data.map((d, i) => `L ${xFor(i)},${yFor(d.cumulativeLessons)}`),
          `L ${xFor(data.length - 1)},${yFor(0)}`,
          'Z',
        ].join(' ')

  // 5 horizontal gridlines.
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((g) => g * yCeil)
  const lastVal = data[data.length - 1]?.cumulativeLessons ?? 0
  const lastX = xFor(data.length - 1)
  const lastY = yFor(lastVal)

  return (
    <div className="rounded-2xl border border-border bg-bg-elev/40 p-5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">{labels.eyebrow}</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 block w-full"
        role="img"
        aria-label="Cumulative lessons engaged over time"
      >
        <title>Cumulative lessons engaged over the last 60 days</title>
        <defs>
          <linearGradient id="engagementFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.30" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines + y-axis labels */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L}
              y1={yFor(v)}
              x2={W - PAD_R}
              y2={yFor(v)}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeWidth={0.5}
            />
            <text
              x={4}
              y={yFor(v) + 4}
              className="fill-current text-[10px] opacity-50 font-mono"
            >
              {Math.round(v)}
            </text>
          </g>
        ))}

        {/* Area + line */}
        {data.length > 0 && <path d={areaPath} fill="url(#engagementFill)" />}
        {data.length > 1 && (
          <polyline
            points={linePts}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Latest-value dot + label */}
        {data.length > 0 && (
          <>
            <circle cx={lastX} cy={lastY} r={4} fill="var(--accent)" />
            <text
              x={lastX - 6}
              y={lastY - 8}
              textAnchor="end"
              className="fill-current text-[11px] font-medium"
            >
              {lastVal}
            </text>
          </>
        )}

        {/* X-axis: only the endpoints labelled, keeps it readable */}
        <text x={PAD_L} y={H - 8} className="fill-current text-[10px] opacity-50 font-mono">
          {labels.start} {data[0]?.date ?? ''}
        </text>
        <text
          x={W - PAD_R}
          y={H - 8}
          textAnchor="end"
          className="fill-current text-[10px] opacity-50 font-mono"
        >
          {labels.today}
        </text>

        {/* Y-axis title — rotated for compactness */}
        <text
          x={-PAD_T - innerH / 2}
          y={10}
          transform="rotate(-90)"
          textAnchor="middle"
          className="fill-current text-[10px] opacity-50 font-mono"
        >
          {labels.yLabel}
        </text>
      </svg>
    </div>
  )
}

/** Round a max value up to a clean multiple (5, 10, 25, 50, 100, …). */
function niceCeiling(max: number): number {
  if (max <= 5) return 5
  if (max <= 10) return 10
  if (max <= 25) return 25
  if (max <= 50) return 50
  if (max <= 100) return 100
  if (max <= 250) return 250
  return Math.ceil(max / 100) * 100
}
