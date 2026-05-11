import { Document, Font, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
/**
 * Server-rendered e-certificate template via @react-pdf/renderer.
 *
 * Renders an A4 landscape PDF with: brand band, title, recipient name,
 * body text (with {{name}} interpolation), issuer + date footer, and a
 * verification URL printed bottom-right for anti-forgery.
 *
 * Used by lib/certificates/generate.ts in a Next.js server action.
 */
import React from 'react'
import type { ReactElement } from 'react'

// Keep React in scope so this module also works under non-automatic-JSX
// runtimes (e.g. when invoked from a tsx smoke-test script).
void React

export type CertificateTemplate = {
  title: string
  /** Body markdown-ish text with `{{name}}` placeholder for the recipient. */
  bodyTemplate: string
  issuerName: string
  issuerRole?: string | null
  /** ISO date string (YYYY-MM-DD). */
  issueDate: string
  /** Hex color like '#7c3aed'. Default purple. */
  accentColor?: string | null
}

export type CertificateData = {
  recipientName: string
  verifyUrl: string
}

// Use a system-safe font stack — no remote fetches at PDF gen time.
Font.registerHyphenationCallback((word) => [word])

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 0,
    fontFamily: 'Helvetica',
    color: '#0f172a',
  },
  innerBorder: {
    margin: 24,
    flex: 1,
    border: '1.5pt solid',
    padding: 32,
    position: 'relative',
  },
  brandBand: {
    height: 8,
    width: '40%',
    marginBottom: 32,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 4,
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 28,
    letterSpacing: 0.5,
  },
  presentedTo: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 10,
  },
  name: {
    fontSize: 44,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 12,
    lineHeight: 1.55,
    color: '#1e293b',
    maxWidth: '85%',
    marginBottom: 36,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
  },
  footerBlock: {},
  signatureLine: {
    width: 180,
    borderTop: '0.5pt solid #94a3b8',
    paddingTop: 6,
  },
  issuerName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  issuerRole: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  dateLabel: {
    fontSize: 9,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  verifyBlock: {
    position: 'absolute',
    bottom: 16,
    right: 32,
    fontSize: 7,
    color: '#94a3b8',
  },
})

function interpolate(template: string, recipientName: string): string {
  return template
    .replace(/\{\{\s*name\s*\}\}/g, recipientName)
    .replace(/\{\{\s*recipient\s*\}\}/g, recipientName)
}

function formatIssueDate(isoDate: string): string {
  // Render as "11 May 2026". Fall back to the raw string if unparseable.
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
  const accent = template.accentColor ?? '#7c3aed'
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={[styles.innerBorder, { borderColor: accent }]}>
          <View style={[styles.brandBand, { backgroundColor: accent }]} />
          <Text style={styles.eyebrow}>Superaccountant</Text>
          <Text style={styles.title}>{template.title}</Text>
          <Text style={styles.presentedTo}>This certificate is proudly presented to</Text>
          <Text style={[styles.name, { color: accent }]}>{data.recipientName}</Text>
          <Text style={styles.body}>{interpolate(template.bodyTemplate, data.recipientName)}</Text>

          <View style={styles.footerRow}>
            <View style={styles.footerBlock}>
              <View style={styles.signatureLine}>
                <Text style={styles.issuerName}>{template.issuerName}</Text>
                {template.issuerRole && (
                  <Text style={styles.issuerRole}>{template.issuerRole}</Text>
                )}
              </View>
            </View>
            <View style={styles.footerBlock}>
              <Text style={styles.dateLabel}>Issued</Text>
              <Text style={styles.dateValue}>{formatIssueDate(template.issueDate)}</Text>
            </View>
          </View>

          <Text style={styles.verifyBlock}>Verify: {data.verifyUrl}</Text>
        </View>
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
