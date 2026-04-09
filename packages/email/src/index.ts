import { Resend } from 'resend'
import { loadEnv } from '@sa/config'

export { buildVerificationEmail } from './templates/verification-email'
export type { VerificationEmailArgs, VerificationEmailContent } from './templates/verification-email'

let client: Resend | null = null

function getClient(): Resend {
  if (client) return client
  const env = loadEnv()
  client = new Resend(env.RESEND_API_KEY)
  return client
}

export type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
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
  })
  if (res.error) throw new Error(`[@sa/email] ${res.error.name}: ${res.error.message}`)
  if (!res.data) throw new Error('[@sa/email] no data returned')
  return { id: res.data.id }
}
