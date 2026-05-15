import { Document, Font, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
/**
 * Server-rendered e-certificate template via @react-pdf/renderer.
 *
 * A4 landscape, professional layout:
 *   - Thin navy accent bar top-left
 *   - SA logo + "Super Accountant / Your AI Tutor" wordmark
 *   - "Certificate of Participation" headline
 *   - "This certificate is proudly presented to" subtitle
 *   - Recipient name (navy, semibold, large)
 *   - Body paragraph(s) with {{name}} interpolation, split on blank lines
 *   - Optional "Held on {date} in {location}." line
 *   - Bottom: signatory (left) + issue date (right)
 *   - Tiny verify URL footer (anti-forgery, low-contrast)
 *
 * Used by lib/certificates/generate.ts in a Next.js server action.
 */
import React from 'react'
import type { ReactElement } from 'react'
import { LOGO_URL } from '../brand'

// Keep React in scope so this module also works under non-automatic-JSX
// runtimes (e.g. when invoked from a tsx smoke-test script).
void React

export type CertificateTemplate = {
  title: string
  /** Body text with `{{name}}` placeholder for the recipient.
   *  Separate paragraphs with `\n\n`. */
  bodyTemplate: string
  issuerName: string
  issuerRole?: string | null
  /** ISO date string (YYYY-MM-DD). */
  issueDate: string
  /** Hex color like '#1e3a5f'. Defaults to professional navy. */
  accentColor?: string | null
  /** Optional venue/city — renders "Held on {date} in {location}." line. */
  location?: string | null
  /** Optional "held on" date if different from issueDate. ISO YYYY-MM-DD. */
  heldOn?: string | null
}

export type CertificateData = {
  recipientName: string
  verifyUrl: string
}

Font.registerHyphenationCallback((word) => [word])

// Palette — professional navy. The accent bar uses the brighter
// medium-blue (`NAVY`); the headline + recipient + signatory use the
// deeper `NAVY_DARK` for visual hierarchy.
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
  // Top accent bar — thin, ~35% width, sits above the logo row.
  accentBar: {
    height: 4,
    width: 180,
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 40,
  },
  brandLogo: {
    height: 40,
    width: 40,
    objectFit: 'contain',
  },
  brandTextBlock: {
    flexDirection: 'column',
    gap: 1,
  },
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
  presentedTo: {
    fontSize: 10,
    color: INK_MUTED,
    marginBottom: 8,
  },
  // Recipient name slot. Empty if recipient is blank.
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
  heldOn: {
    fontSize: 11,
    lineHeight: 1.6,
    color: INK,
    marginBottom: 14,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
    paddingTop: 24,
  },
  footerLeft: {
    width: 220,
  },
  signatureRule: {
    height: 0.7,
    backgroundColor: INK_FAINT,
    marginBottom: 8,
  },
  issuerName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: NAVY_DARK,
  },
  issuerRole: {
    fontSize: 9,
    color: INK_MUTED,
    marginTop: 2,
  },
  dateValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: NAVY_DARK,
    letterSpacing: 1.4,
  },
  // Verify URL — kept on the page for anti-forgery audit, but small
  // enough that it doesn't break the visual hierarchy.
  verifyBlock: {
    position: 'absolute',
    bottom: 14,
    right: 32,
    fontSize: 6.5,
    color: INK_FAINT,
  },
})

function interpolate(template: string, recipientName: string): string {
  return template
    .replace(/\{\{\s*name\s*\}\}/g, recipientName)
    .replace(/\{\{\s*recipient\s*\}\}/g, recipientName)
}

function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function CertificateDocument({
  template,
  data,
}: {
  template: CertificateTemplate
  data: CertificateData
}): ReactElement {
  const accent = template.accentColor ?? NAVY
  const bodyText = interpolate(template.bodyTemplate, data.recipientName)
  // Split into paragraphs on blank lines so multi-paragraph bodies render
  // with proper spacing.
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter((p) => p.length > 0)
  const heldOnDate = template.heldOn ?? template.issueDate
  const heldOnLine =
    template.location && heldOnDate
      ? `Held on ${formatDate(heldOnDate)} in ${template.location}.`
      : null

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
          // Key by index is fine here — the rendered output is static and
          // paragraphs is derived deterministically from the template body.
          // biome-ignore lint/suspicious/noArrayIndexKey: render-only, no reordering
          <Text key={`p-${i}`} style={styles.body}>
            {p}
          </Text>
        ))}

        {heldOnLine && <Text style={styles.heldOn}>{heldOnLine}</Text>}

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

/**
 * Render a single certificate to a Node Buffer. Server-side only.
 */
export async function renderCertificateBuffer(
  template: CertificateTemplate,
  data: CertificateData,
): Promise<Buffer> {
  const doc = <CertificateDocument template={template} data={data} />
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
