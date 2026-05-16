import 'server-only'
import { prisma } from '@sa/db'
import { buildCertificateEmail, sendEmail } from '@sa/email'

/**
 * Bulk-send generated certificates as email + PDF attachment via Resend.
 *
 * For each record in the batch that has a recipient email:
 *   1. Fetch the PDF bytes from the public URL we stored
 *      (Supabase Storage — the URL is already public + signed-by-bucket).
 *   2. Build the email HTML using the author-supplied subject + body
 *      with {{name}} interpolation.
 *   3. Send via Resend with the PDF as an attachment.
 *   4. Stamp `emailedAt` on the record so re-runs skip already-sent rows.
 *
 * Returns a per-recipient status report. The caller surfaces failures
 * but does NOT throw — partial success is a normal outcome.
 *
 * Rate limiting: Resend's free tier is 2 req/sec. We send strictly
 * serial with a 510ms gap (~1.96 req/sec — safely under the cap).
 * On a 429 from Resend we retry up to 3 times with exponential backoff.
 */
export type SendBatchInput = {
  batchId: string
  ownerUserId: string
  subject: string
  body: string
  replyTo?: string | null
}

export type SendBatchResult = {
  sent: { recordId: string; recipientName: string; recipientEmail: string; messageId: string }[]
  skipped: { recordId: string; recipientName: string; reason: string }[]
  failed: { recordId: string; recipientName: string; recipientEmail: string; error: string }[]
}

/** Gap between sends — Resend free tier caps at 2 req/sec. */
const SEND_GAP_MS = 510
/** Max retries on a rate-limit hit before giving up on a row. */
const MAX_RETRIES = 3

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /rate.?limit|429|too.?many.?requests/i.test(msg)
}

export async function sendCertificateBatchEmails(input: SendBatchInput): Promise<SendBatchResult> {
  // Read every record in the batch that's eligible to send.
  const rows = await prisma.$queryRaw<
    {
      id: string
      recipientName: string
      recipientEmail: string | null
      pdfUrl: string | null
      verifyHash: string
      emailedAt: Date | null
    }[]
  >`
    SELECT r."id", r."recipientName", r."recipientEmail", r."pdfUrl",
           r."verifyHash", r."emailedAt"
    FROM "CertificateRecord" r
    JOIN "CertificateBatch" b ON b."id" = r."batchId"
    WHERE r."batchId" = ${input.batchId}
      AND b."ownerUserId" = ${input.ownerUserId}
    ORDER BY r."issuedAt" ASC
  `

  const result: SendBatchResult = { sent: [], skipped: [], failed: [] }
  const appBaseUrl = (process.env.NEXTAUTH_URL ?? 'https://app.superaccountant.in').replace(
    /\/$/,
    '',
  )

  // Partition + queue: filter out rows that can't be sent up front so the
  // pool only processes real work.
  const sendable: typeof rows = []
  for (const r of rows) {
    if (!r.recipientEmail) {
      result.skipped.push({ recordId: r.id, recipientName: r.recipientName, reason: 'no_email' })
      continue
    }
    if (r.emailedAt) {
      result.skipped.push({
        recordId: r.id,
        recipientName: r.recipientName,
        reason: 'already_sent',
      })
      continue
    }
    if (!r.pdfUrl) {
      result.skipped.push({
        recordId: r.id,
        recipientName: r.recipientName,
        reason: 'no_pdf',
      })
      continue
    }
    sendable.push(r)
  }

  // Serial send loop — Resend's free tier is 2 req/sec, so we pace
  // ourselves at slightly under that. Each row may be retried up to
  // MAX_RETRIES times on a 429, with exponential backoff.
  for (let i = 0; i < sendable.length; i++) {
    const r = sendable[i]
    if (!r || !r.recipientEmail || !r.pdfUrl) continue

    // Pace — sleep AFTER each send, not before, so the first one fires
    // immediately. The gap protects subsequent sends from the cap.
    if (i > 0) await sleep(SEND_GAP_MS)

    try {
      const pdfBytes = await fetchPdf(r.pdfUrl)
      const verifyUrl = `${appBaseUrl}/verify/${r.verifyHash}`
      const { html, text } = buildCertificateEmail({
        recipientName: r.recipientName,
        body: input.body,
        verifyUrl,
      })
      const subject = interpolate(input.subject, r.recipientName)
      const messageId = await sendWithRetry({
        to: r.recipientEmail,
        subject,
        html,
        text,
        replyTo: input.replyTo ?? undefined,
        attachments: [
          {
            filename: certificateFilename(r.recipientName),
            content: pdfBytes,
            contentType: 'application/pdf',
          },
        ],
      })
      await prisma.$executeRaw`
        UPDATE "CertificateRecord"
        SET "emailedAt" = NOW(),
            "emailMessageId" = ${messageId}
        WHERE "id" = ${r.id}
      `
      result.sent.push({
        recordId: r.id,
        recipientName: r.recipientName,
        recipientEmail: r.recipientEmail,
        messageId,
      })
    } catch (err) {
      result.failed.push({
        recordId: r.id,
        recipientName: r.recipientName,
        recipientEmail: r.recipientEmail,
        error: err instanceof Error ? err.message : 'send_failed',
      })
    }
  }

  return result
}

/**
 * Send with up to MAX_RETRIES on rate-limit responses. Backoff is
 * exponential: 700ms, 1400ms, 2800ms. Any non-rate-limit error throws
 * immediately so the caller can record it as a real failure.
 */
async function sendWithRetry(args: Parameters<typeof sendEmail>[0]): Promise<string> {
  let lastErr: unknown = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { id } = await sendEmail(args)
      return id
    } catch (err) {
      lastErr = err
      if (!isRateLimit(err) || attempt === MAX_RETRIES) throw err
      await sleep(700 * 2 ** attempt)
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('send_failed')
}

async function fetchPdf(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`pdf_fetch_${res.status}`)
  const ab = await res.arrayBuffer()
  return Buffer.from(ab)
}

function certificateFilename(recipientName: string): string {
  const safe = recipientName.replace(/[^A-Za-z0-9 ._-]/g, '').trim() || 'certificate'
  return `${safe.replace(/\s+/g, '_')}_certificate.pdf`
}

function interpolate(template: string, recipientName: string): string {
  return template
    .replace(/\{\{\s*name\s*\}\}/g, recipientName)
    .replace(/\{\{\s*recipient\s*\}\}/g, recipientName)
}
