import {
  Document,
  Image,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
  Rect,
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
 * Tech Cert · Azure-style — full-height blue accent strip + clinical
 * centred content. Matches Microsoft's certified-professional layout.
 *
 * Visual notes:
 *  - The check-badge bottom-right is a filled blue square (Rect) with a
 *    white tick rendered as a stroked Path. No icon font; pure SVG.
 */
void React

const MS_BLUE = '#0078d4'
const MS_DARK = '#243a5e'
const INK = '#1a1a1a'
const INK_MUTED = '#5a6470'
const RULE = '#cbd1d8'

const PAGE_W = 842
const PAGE_H = 595
const STRIP_W = 10

const styles = StyleSheet.create({
  page: { backgroundColor: '#ffffff', fontFamily: 'Helvetica', color: INK },
  strip: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: STRIP_W,
    height: PAGE_H,
    backgroundColor: MS_BLUE,
  },
  brandRow: {
    position: 'absolute',
    top: 30,
    left: 30 + STRIP_W,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogo: { height: 28, width: 28, objectFit: 'contain' },
  brandText: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: MS_BLUE,
    letterSpacing: 0.4,
  },
  content: {
    position: 'absolute',
    top: 140,
    left: STRIP_W,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 80,
  },
  eyebrow: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: MS_BLUE,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: MS_DARK,
    marginTop: 10,
  },
  recipient: {
    fontSize: 44,
    fontFamily: 'Helvetica-Bold',
    color: MS_BLUE,
    marginTop: 30,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  recipientRule: {
    width: 240,
    height: 0.8,
    backgroundColor: RULE,
    marginTop: 10,
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
    width: 90,
  },
  badgeLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: MS_BLUE,
    letterSpacing: 1.5,
    marginTop: 8,
  },
  signature: {
    position: 'absolute',
    bottom: 80,
    left: 60 + STRIP_W,
    width: 220,
  },
  sigRule: { width: 160, height: 0.7, backgroundColor: RULE, marginBottom: 6 },
  sigName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: MS_DARK },
  sigRole: { fontSize: 10, color: INK_MUTED, marginTop: 2 },
  metaRow: {
    position: 'absolute',
    bottom: 26,
    left: STRIP_W,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  meta: { fontSize: 8, color: INK_MUTED },
})

/** Filled blue square with a white tick — Azure check-badge primitive. */
function CheckBadge(): ReactElement {
  return (
    <Svg width={70} height={70}>
      <Rect x={0} y={0} width={70} height={70} fill={MS_BLUE} />
      {/* Tick stroke */}
      <Path d="M 16 36 L 30 50 L 56 22" stroke="#ffffff" strokeWidth={5} fill="none" />
    </Svg>
  )
}

export function TechCertAzureTemplate({ template, data }: TemplateComponentProps): ReactElement {
  const bodyText = interpolate(template.bodyTemplate, data.recipientName)
  const paragraphs = splitParagraphs(bodyText)
  const heldOn = heldOnLine(template)
  const headlineTitle = template.title || 'Program Completion'

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.strip} />
        <View style={styles.brandRow}>
          <Image src={LOGO_URL} style={styles.brandLogo} />
          <Text style={styles.brandText}>Super Accountant Certified</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.eyebrow}>Super Accountant Certified</Text>
          <Text style={styles.title}>{headlineTitle}</Text>
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
          <CheckBadge />
          <Text style={styles.badgeLabel}>Certified</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>Verify: {data.verifyUrl}</Text>
          <Text style={styles.meta}>·</Text>
          <Text style={styles.meta}>Date: {formatDate(template.issueDate)}</Text>
        </View>
      </Page>
    </Document>
  )
}
