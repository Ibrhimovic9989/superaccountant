import { randomUUID } from 'node:crypto'
import { type CertificateTemplate, renderCertificateBuffer } from './pdf-template'
import {
  type BatchTemplateConfig,
  type IssuedCertificate,
  type Recipient,
  createBatch,
  createRecord,
  ensureCertificateBucket,
  uploadCertificatePdf,
  verifyHashFor,
} from './store'

/**
 * Bulk-generate certificates: render a PDF per recipient, upload each to
 * Supabase Storage, persist a CertificateRecord, return the list of
 * issued certificates with their public URLs.
 *
 * Atomicity note: this is best-effort. If a single recipient fails we
 * skip it and continue. The returned list only contains successfully
 * issued certificates; failures are surfaced via the `failures` array.
 */
export async function generateBatch(args: {
  ownerUserId: string
  template: BatchTemplateConfig
  recipients: Recipient[]
  /** Base URL where the verification page lives, e.g. https://app.example.com */
  appBaseUrl: string
}): Promise<{
  batchId: string
  issued: IssuedCertificate[]
  failures: { recipientName: string; error: string }[]
}> {
  if (args.recipients.length === 0) {
    throw new Error('No recipients to generate certificates for')
  }
  if (args.recipients.length > 500) {
    throw new Error('Limit: max 500 recipients per batch')
  }

  await ensureCertificateBucket()
  const batchId = await createBatch(args.ownerUserId, args.template, args.recipients.length)

  const tplForPdf: CertificateTemplate = {
    title: args.template.title,
    bodyTemplate: args.template.bodyTemplate,
    issuerName: args.template.issuerName,
    issuerRole: args.template.issuerRole ?? null,
    issueDate: args.template.issueDate,
    accentColor: args.template.accentColor ?? null,
  }

  const issued: IssuedCertificate[] = []
  const failures: { recipientName: string; error: string }[] = []

  for (const recipient of args.recipients) {
    const recordId = randomUUID()
    const verifyHash = verifyHashFor(batchId, recordId, recipient.name)
    const verifyUrl = `${args.appBaseUrl.replace(/\/$/, '')}/verify/${verifyHash}`

    try {
      const pdf = await renderCertificateBuffer(tplForPdf, {
        recipientName: recipient.name,
        verifyUrl,
      })
      const pdfUrl = await uploadCertificatePdf(batchId, recordId, pdf)
      const id = await createRecord({
        batchId,
        recipientName: recipient.name,
        recipientEmail: recipient.email ?? null,
        pdfUrl,
        verifyHash,
      })
      issued.push({
        id,
        recipientName: recipient.name,
        recipientEmail: recipient.email ?? null,
        pdfUrl,
        verifyHash,
      })
    } catch (err) {
      failures.push({
        recipientName: recipient.name,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return { batchId, issued, failures }
}
