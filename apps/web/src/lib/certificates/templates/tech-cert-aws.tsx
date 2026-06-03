import {
  Document,
  Image,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
} from '@react-pdf/renderer'
import React, { type ReactElement } from 'react'
import { LOGO_URL } from '../../brand'
import {
  type TemplateComponentProps,
  formatDate,
  heldOnLine,
  interpolate,
  splitParagraphs,
} from './types'

/**
 * Tech Cert · AWS-style — minimal clinical brand-led layout.
 *
 * Pure white page, AWS-orange accent stripe across the top, brand chip
 * top-left, centred title block, body, signatory bottom-left, orange
 * hex badge bottom-right, single-line meta footer.
 *
 * Visual notes:
 *  - Hex badge approximated as a regular hexagon Path (6 vertices) since
 *    @react-pdf has no Polygon primitive that we can fill via Style.
 */
void React

const AWS_ORANGE = '#ff9900'
const AWS_DARK = '#232f3e'
const INK = '#1a1a1a'
const INK_MUTED = '#5a6470'
const RULE = '#cbd1d8'

const PAGE_W = 842
const PAGE_H = 595

const styles = StyleSheet.create({
  page: { backgroundColor: '#ffffff', fontFamily: 'Helvetica', color: INK },
  topStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: AWS_ORANGE,
  },
  brandRow: {
    position: 'absolute',
    top: 24,
    left: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogo: { height: 28, width: 28, objectFit: 'contain' },
  brandText: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: AWS_DARK, letterSpacing: 0.6 },
  // Main content block — centred horizontally.
  content: {
    position: 'absolute',
    top: 150,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 80,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: AWS_DARK,
    letterSpacing: 4,
  },
  recipient: {
    fontSize: 40,
    fontFamily: 'Helvetica-Bold',
    color: AWS_DARK,
    marginTop: 30,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  recipientRule: {
    width: 220,
    height: 0.8,
    backgroundColor: RULE,
    marginTop: 8,
    marginBottom: 22,
  },
  body: {
    fontSize: 12,
    color: INK,
    lineHeight: 1.55,
    textAlign: 'center',
    maxWidth: 480,
    marginBottom: 8,
  },
  heldOn: { fontSize: 10, color: INK_MUTED, marginTop: 8, fontStyle: 'italic' },
  badgeBlock: {
    position: 'absolute',
    bottom: 80,
    right: 60,
    alignItems: 'center',
    width: 100,
  },
  badgeLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: AWS_DARK,
    letterSpacing: 2,
    marginTop: 6,
  },
  signature: {
    position: 'absolute',
    bottom: 80,
    left: 60,
    width: 220,
  },
  sigRule: { width: 160, height: 0.7, backgroundColor: RULE, marginBottom: 6 },
  sigName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: AWS_DARK },
  sigRole: { fontSize: 10, color: INK_MUTED, marginTop: 2 },
  meta: {
    position: 'absolute',
    bottom: 26,
    left: 0,
    right: 0,
    fontSize: 8,
    color: INK_MUTED,
    textAlign: 'center',
  },
})

/** Regular hexagon (point-up), 80pt across, filled orange with "SA". */
function HexBadge(): ReactElement {
  // Hexagon vertices around centre (40,40) with radius 40.
  const cx = 40
  const cy = 40
  const r = 38
  // Point-up hex — vertices at -90°, -30°, 30°, 90°, 150°, 210°.
  const pts = [-90, -30, 30, 90, 150, 210].map((deg) => {
    const rad = (deg * Math.PI) / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
  })
  const d = `M ${pts.map((p) => `${p[0]} ${p[1]}`).join(' L ')} Z`
  return (
    <Svg width={80} height={80}>
      <Path d={d} fill={AWS_ORANGE} />
      <Text
        x={40}
        y={47}
        style={{ fontSize: 22, fontFamily: 'Helvetica-Bold' }}
        fill="#ffffff"
        textAnchor="middle"
      >
        SA
      </Text>
    </Svg>
  )
}

export function TechCertAwsTemplate({ template, data }: TemplateComponentProps): ReactElement {
  const bodyText = interpolate(template.bodyTemplate, data.recipientName)
  const paragraphs = splitParagraphs(bodyText)
  const heldOn = heldOnLine(template)
  const title = template.title || 'CERTIFICATE OF COMPLETION'

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.topStripe} />
        <View style={styles.brandRow}>
          <Image src={LOGO_URL} style={styles.brandLogo} />
          <Text style={styles.brandText}>SuperAccountant Certified</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{title.toUpperCase()}</Text>
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

        <View style={styles.signature}>
          <View style={styles.sigRule} />
          <Text style={styles.sigName}>{template.issuerName}</Text>
          {template.issuerRole && <Text style={styles.sigRole}>{template.issuerRole}</Text>}
        </View>

        <View style={styles.badgeBlock}>
          <HexBadge />
          <Text style={styles.badgeLabel}>CERTIFIED</Text>
        </View>

        <Text style={styles.meta}>
          Issued on: {formatDate(template.issueDate)} · Verify: {data.verifyUrl}
        </Text>
      </Page>
    </Document>
  )
}
