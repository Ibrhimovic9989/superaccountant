import type { LearningCurve } from '@/lib/learning-curves/aggregate'

/**
 * Custom SVG mini chart — mirrors the trajectory chart in the PDF
 * template so the admin web view + PDF look visually consistent.
 *
 * Server component; no client-side interactivity needed.
 */
export function MasteryCurveChart({ phases }: { phases: LearningCurve['phases'] }) {
  const W = 600
  const H = 180
  const PAD_L = 36
  const PAD_R = 12
  const PAD_T = 14
  const PAD_B = 28
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  const n = Math.max(1, phases.length)
  const bandW = innerW / n
  const yFor = (m: number) => PAD_T + innerH - innerH * m
  const xFor = (i: number) => PAD_L + bandW * i + bandW / 2
  const linePts = phases.map((p, i) => `${xFor(i)},${yFor(p.masteryAvg)}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-44 w-full"
      role="img"
      aria-label="Mastery over phases"
    >
      <title>Mastery over phases</title>
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <line
          key={g}
          x1={PAD_L}
          y1={yFor(g)}
          x2={W - PAD_R}
          y2={yFor(g)}
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={0.5}
        />
      ))}
      {[0, 0.5, 1].map((g) => (
        <text key={`yl-${g}`} x={4} y={yFor(g) + 4} className="fill-current text-[10px] opacity-50">
          {Math.round(g * 100)}%
        </text>
      ))}
      {phases.map((p, i) => {
        const x = xFor(i)
        const y = yFor(p.masteryAvg)
        const barW = Math.min(48, bandW * 0.5)
        return (
          <g key={p.phaseId}>
            <rect
              x={x - barW / 2}
              y={y}
              width={barW}
              height={PAD_T + innerH - y}
              className="fill-accent/70"
            />
            <text
              x={x}
              y={H - 8}
              textAnchor="middle"
              className="fill-current text-[10px] opacity-60"
            >
              P{p.order}
            </text>
          </g>
        )
      })}
      {phases.length > 1 && (
        <polyline points={linePts} className="stroke-accent" strokeWidth={1.8} fill="none" />
      )}
    </svg>
  )
}
