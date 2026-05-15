import { loadEnv } from '@sa/config'
import { Resend } from 'resend'

export { buildVerificationEmail } from './templates/verification-email'
export type {
  VerificationEmailArgs,
  VerificationEmailContent,
} from './templates/verification-email'
export { buildCertificateEmail } from './templates/certificate-issued'
export type { CertificateEmailArgs, CertificateEmailContent } from './templates/certificate-issued'

let client: Resend | null = null

function getClient(): Resend {
  if (client) return client
  const env = loadEnv()
  client = new Resend(env.RESEND_API_KEY)
  return client
}

export type EmailAttachment = {
  /** File name as the recipient sees it, e.g. 'certificate.pdf'. */
  filename: string
  /** File bytes — Buffer or base64-encoded string (Resend accepts both). */
  content: Buffer | string
  /** MIME type, defaults to application/octet-stream if omitted. */
  contentType?: string
}

export type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  attachments?: EmailAttachment[]
}

/**
 * Single email sender. All transactional mail (verification, daily nudges,
 * certificate issuance) goes through here. NextAuth's email provider should
 * use `sendEmail` as its `sendVerificationRequest` adapter.
 *
 * Note: until a domain is verified on Resend, EMAIL_FROM must be
 * `onboarding@resend.dev` and recipients must be addresses you control.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  const env = loadEnv()
  const res = await getClient().emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
    // Resend's SDK accepts {filename, content} (Buffer or base64 string).
    // contentType is optional — Resend infers from extension when omitted.
    attachments: input.attachments?.map((a) =>
      a.contentType
        ? { filename: a.filename, content: a.content, contentType: a.contentType }
        : { filename: a.filename, content: a.content },
    ),
  })
  if (res.error) throw new Error(`[@sa/email] ${res.error.name}: ${res.error.message}`)
  if (!res.data) throw new Error('[@sa/email] no data returned')
  return { id: res.data.id }
}
