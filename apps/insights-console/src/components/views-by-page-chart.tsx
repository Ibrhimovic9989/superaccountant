'use client'

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Ga4DailyByTitle } from '@/lib/ga4'

/**
 * Multi-line "Views by page title over time" chart. Matches the GA4
 * report screenshot: one coloured line per top page + a total line
 * across all of them.
 *
 * Server passes { dates, series } — we zip them into Recharts's
 * row-per-x-tick shape locally so we don't ship the reshaping logic
 * up to the aggregator.
 */

// Cool palette so the lines are readable against the near-black bg
// and stay visually distinct even when three of them overlap during
// low-traffic days. Same order the caller sorts by (descending total).
const SERIES_COLORS = [
  '#a78bfa', // violet
  '#22d3ee', // cyan
  '#34d399', // emerald
  '#f472b6', // pink
  '#facc15', // amber
]
const TOTAL_COLOR = '#94a3b8' // slate — muted, not competing with the series colours

const MAX_LEGEND_LABEL_CHARS = 44

function truncateLabel(s: string): string {
  return s.length > MAX_LEGEND_LABEL_CHARS ? `${s.slice(0, MAX_LEGEND_LABEL_CHARS - 1)}…` : s
}

export function ViewsByPageChart({ data }: { data: Ga4DailyByTitle }) {
  if (data.dates.length === 0 || data.series.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.01]">
        <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">
          no per-page views yet
        </p>
      </div>
    )
  }

  // Reshape → one row per date, with each series as a keyed column.
  const rows = data.dates.map((date, idx) => {
    const row: Record<string, string | number> = { date }
    let total = 0
    for (const s of data.series) {
      const v = s.values[idx] ?? 0
      row[s.pageTitle] = v
      total += v
    }
    row.__total__ = total
    return row
  })

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            stroke="rgba(255,255,255,0.4)"
            fontSize={10}
            tickFormatter={(d: string) => d.slice(5)}
            minTickGap={20}
          />
          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: 'rgba(15,15,20,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 11,
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.8)' }}
            formatter={(val: number, name: string) => [val, truncateLabel(String(name))]}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}
            formatter={(v) => truncateLabel(String(v))}
          />
          <Line
            type="monotone"
            dataKey="__total__"
            name="Total"
            stroke={TOTAL_COLOR}
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={{ r: 2, fill: TOTAL_COLOR }}
            activeDot={{ r: 4 }}
          />
          {data.series.slice(0, SERIES_COLORS.length).map((s, i) => (
            <Line
              key={s.pageTitle}
              type="monotone"
              dataKey={s.pageTitle}
              name={s.pageTitle}
              stroke={SERIES_COLORS[i] ?? '#94a3b8'}
              strokeWidth={1.75}
              dot={{ r: 2, fill: SERIES_COLORS[i] ?? '#94a3b8' }}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
