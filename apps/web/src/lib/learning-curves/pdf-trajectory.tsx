import { Path, Rect, Svg, Text } from '@react-pdf/renderer'
import React from 'react'
import type { LearningCurve } from './aggregate'

/**
 * Mastery-per-phase trajectory chart, drawn natively in @react-pdf
 * primitives so the PDF stays self-contained (no chart lib in the
 * bundle). Mirrors apps/web/.../mastery-curve-chart.tsx visually.
 */

const NAVY = '#1e5891'
const NAVY_DARK = '#0f2444'
const INK_MUTED = '#475569'
const INK_FAINT = '#94a3b8'

void React

export function TrajectorySvg({ phases }: { phases: LearningCurve['phases'] }) {
  // Canvas roughly matches the inside of pdf-template's chartBox.
  const W = 320
  const H = 130
  const PAD_L = 24
  const PAD_R = 8
  const PAD_T = 8
  const PAD_B = 22
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  const n = Math.max(1, phases.length)
  const bandW = innerW / n
  const barW = Math.min(36, bandW * 0.55)
  const yFor = (m: number): number => PAD_T + innerH - innerH * m
  const xFor = (i: number): number => PAD_L + bandW * i + (bandW - barW) / 2
  const points = phases.map((p, i) => `${xFor(i) + barW / 2},${yFor(p.masteryAvg)}`).join(' ')

  return (
    <Svg width={W} height={H}>
      {/* gridlines at 25/50/75/100 */}
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <Path
          key={`g-${g}`}
          d={`M ${PAD_L} ${yFor(g)} L ${W - PAD_R} ${yFor(g)}`}
          stroke={INK_FAINT}
          strokeWidth={0.3}
        />
      ))}
      {/* y-axis labels */}
      {[0, 0.5, 1].map((g) => (
        <Text key={`l-${g}`} x={4} y={yFor(g) + 3} style={{ fontSize: 6, color: INK_MUTED }}>
          {`${Math.round(g * 100)}%`}
        </Text>
      ))}
      {/* baseline */}
      <Path
        d={`M ${PAD_L} ${PAD_T + innerH} L ${W - PAD_R} ${PAD_T + innerH}`}
        stroke={INK_MUTED}
        strokeWidth={0.5}
      />
      {/* bars + phase labels */}
      {phases.map((p, i) => {
        const h = Math.max(1, innerH * p.masteryAvg)
        const x = xFor(i)
        const y = PAD_T + innerH - h
        return (
          <React.Fragment key={p.phaseId}>
            <Rect x={x} y={y} width={barW} height={h} fill={NAVY} />
            <Text
              x={x + barW / 2 - 8}
              y={PAD_T + innerH + 10}
              style={{ fontSize: 6, color: INK_MUTED }}
            >
              {`P${p.order}`}
            </Text>
          </React.Fragment>
        )
      })}
      {/* trajectory polyline through bar tops */}
      {phases.length > 1 && (
        <Path
          d={`M ${points.replace(/ /g, ' L ')}`}
          stroke={NAVY_DARK}
          strokeWidth={1.2}
          fill="none"
        />
      )}
    </Svg>
  )
}
