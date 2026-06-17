import type { ActivityDay } from '@/lib/learning-curves/insights'

/**
 * GitHub-style 60-day activity heatmap. One column per week, one cell
 * per day. Cell intensity tracks distinct-lessons-touched on that day.
 *
 * Server component, pure SVG. No tooltips library — uses native <title>
 * elements so hover still shows the date + count, accessible to
 * screen readers and works in the PDF embed too.
 */
export function ActivityHeatmap({ days }: { days: ActivityDay[] }) {
  // Group into columns of 7 (Mon-Sun). The first column is the oldest
  // week — that gives a left-to-right "earliest activity → today" axis.
  const cellSize = 11
  const gap = 3
  // Pad the front so the first cell sits on the right weekday slot.
  const firstDow = new Date(`${days[0]?.date}T00:00:00Z`).getUTCDay() // 0=Sun..6=Sat
  // Shift so Monday is row 0 (more familiar for cohort-cadence reading).
  const startPadCells = (firstDow + 6) % 7
  const all: (ActivityDay | null)[] = []
  for (let i = 0; i < startPadCells; i++) all.push(null)
  for (const d of days) all.push(d)
  // Pad the tail so the last column is full — keeps the grid rectangular.
  while (all.length % 7 !== 0) all.push(null)
  const cols = all.length / 7
  const width = cols * cellSize + (cols - 1) * gap
  const height = 7 * cellSize + 6 * gap

  const maxTouches = Math.max(1, ...days.map((d) => d.touches))

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block"
        style={{ width: '100%', maxWidth: 720, height: 'auto' }}
        role="img"
        aria-label="60-day learning activity"
      >
        <title>Daily learning activity over the last 60 days</title>
        {all.map((d, i) => {
          const col = Math.floor(i / 7)
          const row = i % 7
          const x = col * (cellSize + gap)
          const y = row * (cellSize + gap)
          const opacity = d ? 0.18 + 0.82 * Math.min(1, d.touches / maxTouches) : 0
          const fill = d == null ? 'transparent' : d.touches === 0 ? 'var(--border)' : 'var(--accent)'
          return (
            <g key={`${i}`}>
              <rect
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                rx={2}
                fill={fill}
                opacity={d == null ? 0 : d.touches === 0 ? 0.45 : opacity}
              >
                {d && (
                  <title>
                    {d.date}: {d.touches} lesson{d.touches === 1 ? '' : 's'}
                  </title>
                )}
              </rect>
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-fg-subtle">
        <span>less</span>
        {[0.15, 0.4, 0.65, 0.9].map((o) => (
          <span
            key={o}
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: 'var(--accent)', opacity: o }}
          />
        ))}
        <span>more</span>
      </div>
    </div>
  )
}
