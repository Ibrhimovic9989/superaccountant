'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Ga4DailyPoint } from '@/lib/ga4'

/**
 * 30-day traffic chart: users (area, primary) + sessions (line-like
 * secondary area). Renders "no data" empty state when the series is
 * empty so a cold GA4 propagation doesn't leave a broken chart shell.
 */
export function TrafficChart({ points }: { points: Ga4DailyPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.01]">
        <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">
          waiting for ga4 to warm up
        </p>
      </div>
    )
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="users" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="sessions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
          </defs>
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
          />
          <Area
            type="monotone"
            dataKey="sessions"
            stroke="#22d3ee"
            strokeWidth={1.5}
            fill="url(#sessions)"
            name="Sessions"
          />
          <Area
            type="monotone"
            dataKey="users"
            stroke="#a78bfa"
            strokeWidth={2}
            fill="url(#users)"
            name="Users"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
