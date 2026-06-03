import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import React, { type ReactElement } from 'react'
import {
  type TemplateComponentProps,
  formatDate,
  heldOnLine,
  interpolate,
  splitParagraphs,
} from './types'

/**
 * Ornate Cream — Canva-style program-completion certificate.
 *
 * A4 landscape, warm cream background, double navy border, four gold
 * corner ornaments, brand block, big "Certificate" headline, recipient
 * name underlined, body paragraphs, bottom row with signatory + gold
 * seal medallion + date.
 *
 * Implementation note: built entirely with `<View>` and `<Text>` (no
 * `<Svg>`). @react-pdf v4 silently drops the entire Page when it gets
 * an Svg the size of the page or a complex Svg subcomponent tree, so
 * we stick to View borders for the frame and View-stack for the seal.
 */
void React

const CREAM = '#faf6ec'
const NAVY = '#0f2444'
const GOLD = '#c9971a'

const styles = StyleSheet.create({
  page: {
    backgroundColor: CREAM,
    fontFamily: 'Helvetica',
    color: NAVY,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 80,
  },
  frameOuter: {
    position: 'absolute',
    top: 24,
    left: 24,
    right: 24,
    bottom: 24,
    borderWidth: 1,
    borderColor: NAVY,
  },
  frameInner: {
    position: 'absolute',
    top: 36,
    left: 36,
    right: 36,
    bottom: 36,
    borderWidth: 0.7,
    borderColor: NAVY,
  },
  // Corner ornaments — each is two thin gold bars (vertical + horizontal)
  // forming an L. Placed inside the inner frame's corners.
  cornerArmH: { position: 'absolute', width: 26, height: 1.6, backgroundColor: GOLD },
  cornerArmV: { position: 'absolute', width: 1.6, height: 26, backgroundColor: GOLD },
  brandLine: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    letterSpacing: 2.4,
    textAlign: 'center',
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  taglineLine: { width: 28, height: 0.8, backgroundColor: NAVY, marginHorizontal: 8 },
  taglineDiamond: { width: 5, height: 5, backgroundColor: GOLD, marginHorizontal: 6 },
  tagline: { fontSize: 10, color: NAVY, letterSpacing: 3 },
  headline: {
    fontSize: 64,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    textAlign: 'center',
    marginTop: 12,
  },
  headlineSub: {
    fontSize: 14,
    color: GOLD,
    letterSpacing: 5,
    marginTop: 4,
    marginBottom: 22,
    textAlign: 'center',
  },
  presented: {
    fontSize: 12,
    color: NAVY,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 10,
    textAlign: 'center',
  },
  recipient: {
    fontSize: 36,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    textAlign: 'center',
  },
  recipientRuleRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  recipientRule: { width: 200, height: 0.8, backgroundColor: NAVY },
  body: {
    fontSize: 11.5,
    color: NAVY,
    lineHeight: 1.55,
    textAlign: 'center',
    marginTop: 14,
  },
  heldOn: {
    fontSize: 10,
    color: NAVY,
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 28,
  },
  footerCol: { width: 170 },
  sigRule: { width: 130, height: 0.7, backgroundColor: NAVY, marginBottom: 6 },
  sigName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: NAVY },
  sigRole: { fontSize: 10, color: NAVY, marginTop: 2 },
  centerCol: { alignItems: 'center', width: 120 },
  dateValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'right' },
  dateLabel: { fontSize: 10, color: NAVY, marginTop: 2, textAlign: 'right' },
  verifyBlock: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    fontSize: 7,
    color: NAVY,
    textAlign: 'center',
  },
  // Seal — circular gold border with cream interior + "SA" centered.
  seal: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealText: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: NAVY },
  // Banner under the seal: gold bar with "CERTIFIED" navy text.
  banner: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: GOLD,
  },
  bannerText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: NAVY, letterSpacing: 1.4 },
})

export function OrnateCreamTemplate({ template, data }: TemplateComponentProps): ReactElement {
  const bodyText = interpolate(template.bodyTemplate, data.recipientName)
  const paragraphs = splitParagraphs(bodyText)
  const heldOn = heldOnLine(template)

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Double border */}
        <View style={styles.frameOuter} />
        <View style={styles.frameInner} />

        {/* 4 gold L-bracket corner ornaments (two bars each) — placed
            relative to the inner frame anchor at (36, 36) inset. */}
        <View style={[styles.cornerArmH, { top: 36, left: 36 }]} />
        <View style={[styles.cornerArmV, { top: 36, left: 36 }]} />
        <View style={[styles.cornerArmH, { top: 36, right: 36 }]} />
        <View style={[styles.cornerArmV, { top: 36, right: 36 }]} />
        <View style={[styles.cornerArmH, { bottom: 36, left: 36 }]} />
        <View style={[styles.cornerArmV, { bottom: 36, left: 36 }]} />
        <View style={[styles.cornerArmH, { bottom: 36, right: 36 }]} />
        <View style={[styles.cornerArmV, { bottom: 36, right: 36 }]} />

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
        <View style={styles.recipientRuleRow}>
          <View style={styles.recipientRule} />
        </View>

        {paragraphs.map((p, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: render-only
          <Text key={`p-${i}`} style={styles.body}>
            {p}
          </Text>
        ))}
        {heldOn && <Text style={styles.heldOn}>{heldOn}</Text>}

        <View style={styles.footerRow}>
          <View style={styles.footerCol}>
            <View style={styles.sigRule} />
            <Text style={styles.sigName}>{template.issuerName}</Text>
            {template.issuerRole && <Text style={styles.sigRole}>{template.issuerRole}</Text>}
          </View>
          <View style={styles.centerCol}>
            <View style={styles.seal}>
              <Text style={styles.sealText}>SA</Text>
            </View>
            <View style={styles.banner}>
              <Text style={styles.bannerText}>CERTIFIED</Text>
            </View>
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
