import { Document, Font, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
import React from 'react'
import type { ReactElement } from 'react'
import { LOGO_URL } from '../brand'
import type { LearningCurve } from './aggregate'
import { TrajectorySvg } from './pdf-trajectory'

/**
 * Server-rendered "learning trajectory" PDF for recruiter handoff.
 *
 * A4 landscape, professional layout — same palette + fonts as the
 * certificate template so the two documents look like siblings.
 *
 *   1. Top accent bar + brand row
 *   2. Student block (name, email, market badge, enrolled-since)
 *   3. Entry assessment band (score % + placed phase)
 *   4. Phase progress (4 stacked horizontal bars)
 *   5. Trajectory chart (mastery per phase, native <Svg> bars)
 *   6. Grand test band
 *   7. Verify footer (HMAC-signed URL + issue date)
 *
 * All chart drawing uses @react-pdf primitives (<Svg>, <Rect>, <Path>,
 * <View> with backgroundColor) — no external charting lib. Keeps the
 * bundle lean and matches the brief's "@react-pdf primitives over npm
 * chart libs" rule.
 */

void React
Font.registerHyphenationCallback((word) => [word])

const NAVY = '#1e5891'
const NAVY_DARK = '#0f2444'
const INK = '#0f172a'
const INK_MUTED = '#475569'
const INK_FAINT = '#94a3b8'
const SURFACE = '#f1f5f9'
const SUCCESS = '#15803d'
const DANGER = '#b91c1c'

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 36,
    fontFamily: 'Helvetica',
    color: INK,
  },
  accentBar: { height: 4, width: 180, marginBottom: 14, backgroundColor: NAVY },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  brandLogo: { height: 32, width: 32, objectFit: 'contain' },
  brandName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: NAVY_DARK,
    letterSpacing: 0.2,
  },
  brandTagline: {
    fontSize: 6.5,
    color: INK_MUTED,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  reportTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: NAVY_DARK,
    marginBottom: 14,
  },
  studentBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 0.5,
    borderBottomColor: INK_FAINT,
    paddingBottom: 10,
    marginBottom: 14,
  },
  studentName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: NAVY_DARK },
  studentMeta: { fontSize: 9, color: INK_MUTED, marginTop: 3 },
  marketBadge: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    borderWidth: 0.7,
    borderColor: NAVY,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  // Section heading — small caps mono-ish navy label.
  sectionHead: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: INK_MUTED,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 4,
    padding: 10,
  },
  scoreLabel: { fontSize: 8, color: INK_MUTED, letterSpacing: 1, textTransform: 'uppercase' },
  scoreValue: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: NAVY_DARK,
    marginTop: 4,
  },
  scoreSubvalue: { fontSize: 8, color: INK_MUTED, marginTop: 2 },
  passBadge: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: SUCCESS,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  failBadge: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: DANGER,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  // ── phase progress bars ─────────────────────────
  phaseRow: { marginBottom: 8 },
  phaseHead: { flexDirection: 'row', justifyContent: 'space-between' },
  phaseTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: INK },
  phaseMeta: { fontSize: 8, color: INK_MUTED },
  barTrack: {
    height: 8,
    width: '100%',
    backgroundColor: SURFACE,
    borderRadius: 2,
    marginTop: 4,
    position: 'relative',
  },
  // Two-row layout to give the chart room without a second page.
  middleRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  middleCol: { flex: 1 },
  chartBox: {
    backgroundColor: SURFACE,
    borderRadius: 4,
    padding: 10,
    height: 150,
  },
  chartCaption: { fontSize: 7, color: INK_MUTED, marginTop: 4 },
  // ── footer / verify ─────────────────────────────
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: INK_FAINT,
  },
  verifyLabel: { fontSize: 6.5, color: INK_FAINT, letterSpacing: 1 },
  verifyUrl: { fontSize: 7, color: INK_MUTED },
  dateValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: NAVY_DARK,
    letterSpacing: 1,
  },
})

export type LearningCurvePdfData = {
  curve: LearningCurve
  /** Public URL the recruiter can hit to confirm authenticity. */
  verifyUrl: string
  /** ISO date string for the "Generated on" footer. */
  generatedAt: string
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`
}

function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function PhaseBar({
  title,
  total,
  completed,
  mastery,
}: {
  title: string
  total: number
  completed: number
  mastery: number
}) {
  const completionPct = total > 0 ? completed / total : 0
  const completionWidth = `${Math.round(completionPct * 100)}%`
  const masteryWidth = `${Math.round(mastery * 100)}%`
  return (
    <View style={styles.phaseRow}>
      <View style={styles.phaseHead}>
        <Text style={styles.phaseTitle}>{title}</Text>
        <Text style={styles.phaseMeta}>
          {completed}/{total} lessons · {pct(mastery)} mastery
        </Text>
      </View>
      {/* completion track */}
      <View style={styles.barTrack}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: completionWidth,
            backgroundColor: NAVY,
            borderRadius: 2,
          }}
        />
      </View>
      {/* mastery hint — lower, lighter track */}
      <View style={[styles.barTrack, { height: 4, marginTop: 2 }]}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: masteryWidth,
            backgroundColor: NAVY_DARK,
            borderRadius: 2,
            opacity: 0.55,
          }}
        />
      </View>
    </View>
  )
}

function LearningCurveDocument({ data }: { data: LearningCurvePdfData }): ReactElement {
  const { curve, verifyUrl, generatedAt } = data
  const entryScorePct = curve.entryTest ? pct(curve.entryTest.score) : '—'
  const placedPhaseLabel = curve.entryTest ? `Phase ${curve.entryTest.placedPhase}` : '—'
  const grandScorePct = curve.grandTest ? pct(curve.grandTest.score) : '—'

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.accentBar} />

        <View style={styles.brandRow}>
          <Image src={LOGO_URL} style={styles.brandLogo} />
          <View>
            <Text style={styles.brandName}>Super Accountant</Text>
            <Text style={styles.brandTagline}>— Learning Trajectory Report —</Text>
          </View>
        </View>

        <Text style={styles.reportTitle}>Candidate learning curve</Text>

        {/* ── Student block ───────────────────────────── */}
        <View style={styles.studentBlock}>
          <View>
            <Text style={styles.studentName}>{curve.user.name}</Text>
            <Text style={styles.studentMeta}>
              {curve.user.email} · Enrolled {formatDate(curve.user.enrolledAt)}
            </Text>
          </View>
          <Text style={styles.marketBadge}>
            {curve.user.market === 'ksa' ? 'KSA Track' : 'India Track'}
          </Text>
        </View>

        {/* ── Score row (entry + overall + grand) ─────── */}
        <Text style={styles.sectionHead}>Before · During · After</Text>
        <View style={styles.scoreRow}>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Entry assessment</Text>
            <Text style={styles.scoreValue}>{entryScorePct}</Text>
            <Text style={styles.scoreSubvalue}>
              Placed in {placedPhaseLabel}
              {curve.entryTest ? ` · ${formatDate(curve.entryTest.takenAt)}` : ''}
            </Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Overall mastery</Text>
            <Text style={styles.scoreValue}>{pct(curve.overallMastery)}</Text>
            <Text style={styles.scoreSubvalue}>{curve.totalDaysActive} active days</Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Grand test</Text>
            <Text style={styles.scoreValue}>{grandScorePct}</Text>
            {curve.grandTest ? (
              <Text style={curve.grandTest.passed ? styles.passBadge : styles.failBadge}>
                {curve.grandTest.passed ? 'Passed' : 'Not passed'}
                {` · ${formatDate(curve.grandTest.takenAt)}`}
              </Text>
            ) : (
              <Text style={styles.scoreSubvalue}>Not yet attempted</Text>
            )}
          </View>
        </View>

        {/* ── Middle row: phase bars + trajectory chart ── */}
        <View style={styles.middleRow}>
          <View style={styles.middleCol}>
            <Text style={styles.sectionHead}>Phase progress</Text>
            {curve.phases.length === 0 ? (
              <Text style={styles.phaseMeta}>No curriculum data yet.</Text>
            ) : (
              curve.phases.map((p) => (
                <PhaseBar
                  key={p.phaseId}
                  title={`Phase ${p.order} · ${p.titleEn}`}
                  total={p.totalLessons}
                  completed={p.completedLessons}
                  mastery={p.masteryAvg}
                />
              ))
            )}
          </View>
          <View style={styles.middleCol}>
            <Text style={styles.sectionHead}>Mastery curve</Text>
            <View style={styles.chartBox}>
              <TrajectorySvg phases={curve.phases} />
            </View>
            <Text style={styles.chartCaption}>
              Mean mastery (0–100%) across each curriculum phase.
            </Text>
          </View>
        </View>

        {/* ── Footer ──────────────────────────────────── */}
        <View style={styles.footerRow}>
          <View>
            <Text style={styles.verifyLabel}>VERIFY</Text>
            <Text style={styles.verifyUrl}>{verifyUrl}</Text>
          </View>
          <View>
            <Text style={styles.dateValue}>{formatDate(generatedAt)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

/** Render the learning curve PDF to a Node Buffer. Server-side only. */
export async function renderLearningCurveBuffer(data: LearningCurvePdfData): Promise<Buffer> {
  const doc = <LearningCurveDocument data={data} />
  const stream = await pdf(doc).toBuffer()
  return await streamToBuffer(stream as unknown as NodeJS.ReadableStream)
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolveP, rejectP) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('end', () => resolveP(Buffer.concat(chunks)))
    stream.on('error', rejectP)
  })
}
