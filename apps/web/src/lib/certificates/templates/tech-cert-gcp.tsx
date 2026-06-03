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
 * Tech Cert · Google Cloud-style — clean geometric minimalism.
 *
 * Pure white page, bottom-left overlapping Google brand-color diagonal
 * bands, top-right brand chip, centred title block with Google-blue
 * recipient name, signatory bottom-left (above the bands), date + verify
 * URL bottom-right.
 *
 * Visual notes:
 *  - The four bands are stacked Paths (parallelograms) — order matters,
 *    blue at the back, then red, yellow, green at the front so each
 *    colour shows roughly equal area.
 */
void React

const G_BLUE = '#4285f4'
const G_RED = '#ea4335'
const G_YELLOW = '#fbbc05'
const G_GREEN = '#34a853'
const INK = '#202124'
const INK_MUTED = '#5f6368'
const RULE = '#dadce0'

const PAGE_W = 842
const PAGE_H = 595

const styles = StyleSheet.create({
  page: { backgroundColor: '#ffffff', fontFamily: 'Helvetica', color: INK },
  decor: { position: 'absolute', left: 0, bottom: 0 },
  brandRow: {
    position: 'absolute',
    top: 30,
    right: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogo: { height: 28, width: 28, objectFit: 'contain' },
  brandText: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    letterSpacing: 0.4,
  },
  content: {
    position: 'absolute',
    top: 150,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 80,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    letterSpacing: 4,
  },
  recipient: {
    fontSize: 42,
    fontFamily: 'Helvetica-Bold',
    color: G_BLUE,
    marginTop: 30,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  recognized: {
    fontSize: 14,
    color: INK,
    fontStyle: 'italic',
    marginTop: 14,
    textAlign: 'center',
    maxWidth: 460,
  },
  body: {
    fontSize: 12,
    color: INK,
    lineHeight: 1.55,
    textAlign: 'center',
    maxWidth: 480,
    marginTop: 22,
    marginBottom: 8,
  },
  heldOn: { fontSize: 10, color: INK_MUTED, marginTop: 8, fontStyle: 'italic' },
  signature: {
    position: 'absolute',
    bottom: 70,
    left: 140,
    width: 240,
  },
  sigRule: { width: 160, height: 0.7, backgroundColor: RULE, marginBottom: 6 },
  sigName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: INK },
  sigRole: { fontSize: 10, color: INK_MUTED, marginTop: 2 },
  dateBlock: {
    position: 'absolute',
    bottom: 70,
    right: 60,
    alignItems: 'flex-end',
    width: 240,
  },
  dateValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: INK },
  dateLabel: { fontSize: 10, color: INK_MUTED, marginTop: 2 },
  verify: {
    position: 'absolute',
    bottom: 24,
    right: 60,
    fontSize: 8,
    color: INK_MUTED,
  },
})

/** Bottom-left decor — four overlapping Google-coloured parallelogram
 *  bands occupying ~140×140 of the page corner. Stack from back to front:
 *  blue → red → yellow → green. */
function GoogleCornerDecor(): ReactElement {
  const W = 160
  const H = 160
  return (
    <Svg width={W} height={H} style={styles.decor}>
      <Path d="M 0 60 L 90 0 L 160 0 L 0 160 Z" fill={G_BLUE} />
      <Path d="M 0 100 L 100 0 L 145 0 L 0 160 Z" fill={G_RED} />
      <Path d="M 0 140 L 110 0 L 130 0 L 0 160 Z" fill={G_YELLOW} />
      <Path d="M 0 160 L 120 0 L 0 0 Z" fill={G_GREEN} />
    </Svg>
  )
}

export function TechCertGcpTemplate({ template, data }: TemplateComponentProps): ReactElement {
  const bodyText = interpolate(template.bodyTemplate, data.recipientName)
  const paragraphs = splitParagraphs(bodyText)
  const heldOn = heldOnLine(template)
  const title = template.title || 'CERTIFICATE OF COMPLETION'

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <GoogleCornerDecor />

        <View style={styles.brandRow}>
          <Image src={LOGO_URL} style={styles.brandLogo} />
          <Text style={styles.brandText}>SuperAccountant Certified</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{title.toUpperCase()}</Text>
          <Text style={styles.recipient}>{data.recipientName}</Text>
          <Text style={styles.recognized}>
            is recognized as a SuperAccountant Certified Professional
          </Text>
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

        <View style={styles.dateBlock}>
          <Text style={styles.dateValue}>{formatDate(template.issueDate)}</Text>
          <Text style={styles.dateLabel}>Date of Issue</Text>
        </View>

        <Text style={styles.verify}>Verify: {data.verifyUrl}</Text>
      </Page>
    </Document>
  )
}
