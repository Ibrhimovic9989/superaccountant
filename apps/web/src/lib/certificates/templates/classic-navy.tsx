import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
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
 * Classic Navy — the original SuperAccountant certificate design.
 *
 * A4 landscape, white page, thin navy accent bar, logo + wordmark,
 * navy headline, recipient block, body paragraphs, signatory left /
 * date right, tiny verify-url footer.
 *
 * Preserved verbatim from the original `pdf-template.tsx` so this is the
 * safe default for every batch issued before the registry existed.
 */
void React // keep React in scope for non-automatic-JSX runtimes (tsx scripts)

const NAVY = '#1e5891'
const NAVY_DARK = '#0f2444'
const INK = '#0f172a'
const INK_MUTED = '#475569'
const INK_FAINT = '#94a3b8'

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 56,
    fontFamily: 'Helvetica',
    color: INK,
  },
  accentBar: { height: 4, width: 180, marginBottom: 18 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 40,
  },
  brandLogo: { height: 40, width: 40, objectFit: 'contain' },
  brandTextBlock: { flexDirection: 'column', gap: 1 },
  brandName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: NAVY_DARK,
    letterSpacing: 0.2,
  },
  brandTagline: {
    fontSize: 7,
    color: INK_MUTED,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 38,
    fontFamily: 'Helvetica-Bold',
    color: NAVY_DARK,
    marginBottom: 28,
    letterSpacing: 0.2,
  },
  presentedTo: { fontSize: 10, color: INK_MUTED, marginBottom: 8 },
  recipientName: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: NAVY_DARK,
    marginBottom: 28,
    letterSpacing: 0.3,
    minHeight: 36,
  },
  body: {
    fontSize: 11,
    lineHeight: 1.6,
    color: INK,
    marginBottom: 14,
    maxWidth: '92%',
  },
  heldOn: { fontSize: 11, lineHeight: 1.6, color: INK, marginBottom: 14 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
    paddingTop: 24,
  },
  footerLeft: { width: 220 },
  signatureRule: { height: 0.7, backgroundColor: INK_FAINT, marginBottom: 8 },
  issuerName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: NAVY_DARK,
  },
  issuerRole: { fontSize: 9, color: INK_MUTED, marginTop: 2 },
  dateValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: NAVY_DARK,
    letterSpacing: 1.4,
  },
  verifyBlock: {
    position: 'absolute',
    bottom: 14,
    right: 32,
    fontSize: 6.5,
    color: INK_FAINT,
  },
})

export function ClassicNavyTemplate({ template, data }: TemplateComponentProps): ReactElement {
  const accent = template.accentColor ?? NAVY
  const bodyText = interpolate(template.bodyTemplate, data.recipientName)
  const paragraphs = splitParagraphs(bodyText)
  const heldOn = heldOnLine(template)

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={[styles.accentBar, { backgroundColor: accent }]} />

        <View style={styles.brandRow}>
          <Image src={LOGO_URL} style={styles.brandLogo} />
          <View style={styles.brandTextBlock}>
            <Text style={styles.brandName}>Super Accountant</Text>
            <Text style={styles.brandTagline}>— Your AI Tutor —</Text>
          </View>
        </View>

        <Text style={styles.title}>{template.title}</Text>
        <Text style={styles.presentedTo}>This certificate is proudly presented to</Text>
        <Text style={styles.recipientName}>{data.recipientName}</Text>

        {paragraphs.map((p, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: render-only, deterministic order
          <Text key={`p-${i}`} style={styles.body}>
            {p}
          </Text>
        ))}

        {heldOn && <Text style={styles.heldOn}>{heldOn}</Text>}

        <View style={styles.footerRow}>
          <View style={styles.footerLeft}>
            <View style={styles.signatureRule} />
            <Text style={styles.issuerName}>{template.issuerName}</Text>
            {template.issuerRole && <Text style={styles.issuerRole}>{template.issuerRole}</Text>}
          </View>
          <View>
            <Text style={styles.dateValue}>{formatDate(template.issueDate)}</Text>
          </View>
        </View>

        <Text style={styles.verifyBlock}>Verify: {data.verifyUrl}</Text>
      </Page>
    </Document>
  )
}
