import {
  Document,
  Page,
  Path,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
  Circle,
  G,
} from '@react-pdf/renderer'
import React, { type ReactElement } from 'react'
import {
  type TemplateComponentProps,
  formatDate,
  heldOnLine,
  interpolate,
  splitParagraphs,
} from './types'

/**
 * Ornate Cream — Canva-style program completion certificate.
 *
 * A4 landscape, warm cream background, double navy frame, four gold
 * L-bracket corner ornaments, brand block + main "Certificate" headline,
 * recipient name underlined, body paragraphs, bottom row with signatory
 * (left), gold ribbon medallion (centre), date (right). Tiny verify URL
 * footer is preserved for forgery resistance.
 *
 * Visual judgment calls (documented for future tweaks):
 *  - Ribbon medallion approximated as a circle + 2 trapezoidal tails
 *    (Path), since @react-pdf has no native ribbon primitive.
 *  - Corner ornaments are two perpendicular short strokes + a tiny inner
 *    curl (Bezier arc) — close enough to "L-bracket with flourish".
 */
void React

// Page-local palette — co-located per CLAUDE.md (don't centralize).
const CREAM = '#faf6ec'
const NAVY = '#0f2444'
const GOLD = '#c9971a'

// A4 landscape is 842pt × 595pt. Frame insets are taken from page edge.
const PAGE_W = 842
const PAGE_H = 595
const OUTER_INSET = 24
const INNER_INSET = 36

const styles = StyleSheet.create({
  page: { backgroundColor: CREAM, fontFamily: 'Helvetica', color: NAVY },
  // Frame layer fills the whole page; content overlays it.
  frame: { position: 'absolute', top: 0, left: 0, width: PAGE_W, height: PAGE_H },
  content: {
    position: 'absolute',
    top: 60,
    left: 70,
    right: 70,
    bottom: 60,
    alignItems: 'center',
  },
  brandLine: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    letterSpacing: 2.5,
    marginBottom: 8,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 56,
  },
  taglineLine: { width: 24, height: 0.8, backgroundColor: NAVY },
  taglineDiamond: {
    width: 5,
    height: 5,
    backgroundColor: GOLD,
    transform: 'rotate(45deg)',
  },
  tagline: { fontSize: 10, color: NAVY, letterSpacing: 3 },
  headline: {
    fontSize: 80,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    letterSpacing: 1,
  },
  headlineSub: {
    fontSize: 16,
    color: GOLD,
    letterSpacing: 5,
    marginTop: 10,
    marginBottom: 32,
  },
  presented: {
    fontSize: 12,
    color: NAVY,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  recipient: {
    fontSize: 44,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    letterSpacing: 0.5,
  },
  recipientRule: { width: 180, height: 0.8, backgroundColor: NAVY, marginTop: 6, marginBottom: 16 },
  body: {
    fontSize: 12,
    color: NAVY,
    lineHeight: 1.55,
    textAlign: 'center',
    maxWidth: 430,
    marginBottom: 6,
  },
  heldOn: { fontSize: 10, color: NAVY, textAlign: 'center', marginTop: 6, fontStyle: 'italic' },
  // Bottom 3-column row, anchored ~70pt above page bottom.
  footerRow: {
    position: 'absolute',
    left: 80,
    right: 80,
    bottom: 70,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  footerCol: { width: 200 },
  sigRule: { width: 120, height: 0.7, backgroundColor: NAVY, marginBottom: 6 },
  sigName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: NAVY },
  sigRole: { fontSize: 10, color: NAVY, marginTop: 2 },
  centerCol: { alignItems: 'center', justifyContent: 'flex-end', width: 120 },
  dateValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'right' },
  dateLabel: { fontSize: 10, color: NAVY, marginTop: 2, textAlign: 'right' },
  verifyBlock: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    fontSize: 7,
    color: NAVY,
    textAlign: 'center',
  },
})

/** Decorative frame: double rectangle border + 4 gold L-corner brackets.
 *  Drawn via Svg so stroke widths and corner geometry stay crisp. */
function OrnateFrame(): ReactElement {
  const o = OUTER_INSET
  const i = INNER_INSET
  const ow = PAGE_W - o * 2
  const oh = PAGE_H - o * 2
  const iw = PAGE_W - i * 2
  const ih = PAGE_H - i * 2
  // Inner corner anchor points where gold brackets sit.
  const corners: Array<{ x: number; y: number; sx: number; sy: number }> = [
    { x: i, y: i, sx: 1, sy: 1 }, // top-left: open down-right
    { x: PAGE_W - i, y: i, sx: -1, sy: 1 }, // top-right
    { x: i, y: PAGE_H - i, sx: 1, sy: -1 }, // bottom-left
    { x: PAGE_W - i, y: PAGE_H - i, sx: -1, sy: -1 }, // bottom-right
  ]
  // Bracket arm length and the small inner-curl radius.
  const L = 28
  const C = 6

  return (
    <Svg width={PAGE_W} height={PAGE_H} style={styles.frame}>
      <Rect x={o} y={o} width={ow} height={oh} stroke={NAVY} strokeWidth={1} fill="none" />
      <Rect x={i} y={i} width={iw} height={ih} stroke={NAVY} strokeWidth={0.7} fill="none" />
      {corners.map((c) => (
        <G key={`corner-${c.x}-${c.y}`}>
          {/* horizontal arm */}
          <Path
            d={`M ${c.x} ${c.y} l ${L * c.sx} 0`}
            stroke={GOLD}
            strokeWidth={1.6}
            fill="none"
          />
          {/* vertical arm */}
          <Path
            d={`M ${c.x} ${c.y} l 0 ${L * c.sy}`}
            stroke={GOLD}
            strokeWidth={1.6}
            fill="none"
          />
          {/* tiny inner-curl flourish near the elbow */}
          <Path
            d={`M ${c.x + 10 * c.sx} ${c.y + 10 * c.sy} q ${C * c.sx} ${-C * c.sy} ${2 * C * c.sx} 0`}
            stroke={GOLD}
            strokeWidth={1}
            fill="none"
          />
        </G>
      ))}
    </Svg>
  )
}

/** Gold ribbon medallion: circle stroked in gold with navy "SA",
 *  two trapezoidal ribbon tails beneath bearing "CERTIFIED". */
function RibbonMedallion(): ReactElement {
  // Local coords; SVG canvas is 120×100.
  return (
    <Svg width={120} height={100}>
      {/* Left ribbon tail */}
      <Path d="M 30 55 L 14 92 L 30 84 L 44 76 Z" fill={GOLD} />
      {/* Right ribbon tail */}
      <Path d="M 90 55 L 106 92 L 90 84 L 76 76 Z" fill={GOLD} />
      {/* Banner ribbon body */}
      <Rect x={28} y={62} width={64} height={18} fill={GOLD} />
      <Text
        x={60}
        y={75}
        style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}
        fill={NAVY}
        textAnchor="middle"
      >
        CERTIFIED
      </Text>
      {/* Seal — gold outer + cream inner + navy SA */}
      <Circle cx={60} cy={36} r={28} fill={GOLD} />
      <Circle cx={60} cy={36} r={24} fill={CREAM} />
      <Circle cx={60} cy={36} r={24} stroke={GOLD} strokeWidth={1} fill="none" />
      <Text
        x={60}
        y={42}
        style={{ fontSize: 16, fontFamily: 'Helvetica-Bold' }}
        fill={NAVY}
        textAnchor="middle"
      >
        SA
      </Text>
    </Svg>
  )
}

export function OrnateCreamTemplate({ template, data }: TemplateComponentProps): ReactElement {
  const bodyText = interpolate(template.bodyTemplate, data.recipientName)
  const paragraphs = splitParagraphs(bodyText)
  const heldOn = heldOnLine(template)

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <OrnateFrame />

        <View style={styles.content}>
          <Text style={styles.brandLine}>SUPER ACCOUNTANT</Text>
          <View style={styles.taglineRow}>
            <View style={styles.taglineLine} />
            <View style={styles.taglineDiamond} />
            <Text style={styles.tagline}>YOUR AI TUTOR</Text>
            <View style={styles.taglineDiamond} />
            <View style={styles.taglineLine} />
          </View>

          <Text style={styles.headline}>Certificate</Text>
          <Text style={styles.headlineSub}>OF COMPLETION</Text>

          <Text style={styles.presented}>This certificate is proudly presented to</Text>
          <Text style={styles.recipient}>{data.recipientName}</Text>
          <View style={styles.recipientRule} />

          {paragraphs.map((p, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: render-only, deterministic order
            <Text key={`p-${i}`} style={styles.body}>
              {p}
            </Text>
          ))}
          {heldOn && <Text style={styles.heldOn}>{heldOn}</Text>}
        </View>

        <View style={styles.footerRow}>
          <View style={styles.footerCol}>
            <View style={styles.sigRule} />
            <Text style={styles.sigName}>{template.issuerName}</Text>
            {template.issuerRole && <Text style={styles.sigRole}>{template.issuerRole}</Text>}
          </View>
          <View style={styles.centerCol}>
            <RibbonMedallion />
          </View>
          <View style={styles.footerCol}>
            <Text style={styles.dateValue}>{formatDate(template.issueDate)}</Text>
            <Text style={styles.dateLabel}>Date of Issue</Text>
          </View>
        </View>

        <Text style={styles.verifyBlock}>Verify: {data.verifyUrl}</Text>
      </Page>
    </Document>
  )
}
