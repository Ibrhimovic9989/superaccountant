import type { WeeklyAttempts } from '@/lib/learning-curves/insights'

/**
 * Weekly attempt-volume bars with the bar colour also encoding mean
 * score (red→yellow→green). Two signals in one chart: how busy were
 * they, and were the attempts succeeding.
 *
 * Server-only SVG.
 */
export function WeeklyAttemptsBars({
  data,
  labels,
}: {
  data: WeeklyAttempts[]
  labels: { eyebrow: string; yLabel: string; noData: string }
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-bg-elev/40 p-5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          {labels.eyebrow}
        </p>
        <p className="mt-3 text-sm text-fg-subtle">{labels.noData}</p>
      </div>
    )
  }

  const W = 600
  const H = 200
  const PAD_L = 28
  const PAD_R = 12
  const PAD_T = 14
  const PAD_B = 28
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const maxAttempts = Math.max(1, ...data.map((d) => d.attempts))
  const yCeil = niceCeiling(maxAttempts)
  const yFor = (v: number) => PAD_T + innerH - (v / yCeil) * innerH

  const bandW = innerW / data.length
  const barW = Math.max(8, bandW * 0.65)

  return (
    <div className="rounded-2xl border border-border bg-bg-elev/40 p-5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">{labels.eyebrow}</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 block w-full"
        role="img"
        aria-label="Assessment attempts per week"
      >
        <title>Assessment attempts per ISO week (last 12 weeks)</title>

        {/* Horizontal gridlines */}
        {[0, 0.5, 1].map((g) => (
          <g key={g}>
            <line
              x1={PAD_L}
              y1={yFor(g * yCeil)}
              x2={W - PAD_R}
              y2={yFor(g * yCeil)}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeWidth={0.5}
            />
            <text
              x={4}
              y={yFor(g * yCeil) + 4}
              className="fill-current text-[10px] opacity-50 font-mono"
            >
              {Math.round(g * yCeil)}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const x = PAD_L + bandW * i + (bandW - barW) / 2
          const y = yFor(d.attempts)
          const h = PAD_T + innerH - y
          const fill = scoreToColor(d.meanScore)
          return (
            <g key={d.weekStart}>
              <rect x={x} y={y} width={barW} height={h} rx={2} fill={fill}>
                <title>
                  {d.weekStart} — {d.attempts} attempt{d.attempts === 1 ? '' : 's'}
                  {d.meanScore != null ? `, mean ${Math.round(d.meanScore * 100)}%` : ''}
                </title>
              </rect>
              {/* Sparse x-axis labels — every other week — to avoid overlap */}
              {(i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) && (
                <text
                  x={x + barW / 2}
                  y={H - 8}
                  textAnchor="middle"
                  className="fill-current text-[10px] opacity-50 font-mono"
                >
                  {d.weekStart.slice(5)}
                </text>
              )}
            </g>
          )
        })}

        {/* Y-axis label */}
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

      {/* Mini legend — colour scale */}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-fg-subtle">
        <span>mean score:</span>
        <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: scoreToColor(0.2) }} />
        <span>weak</span>
        <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: scoreToColor(0.55) }} />
        <span>passing</span>
        <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: scoreToColor(0.9) }} />
        <span>strong</span>
      </div>
    </div>
  )
}

function scoreToColor(score: number | null): string {
  if (score == null) return 'var(--border-strong)'
  if (score >= 0.75) return 'var(--success)'
  if (score >= 0.5) return 'var(--accent)'
  return 'var(--warning)'
}

function niceCeiling(max: number): number {
  if (max <= 3) return 4
  if (max <= 5) return 5
  if (max <= 10) return 10
  if (max <= 20) return 20
  return Math.ceil(max / 10) * 10
}
