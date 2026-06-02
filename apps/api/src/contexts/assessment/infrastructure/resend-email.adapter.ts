/**
 * Adapter: EmailPort → @sa/email's Resend-backed sendEmail.
 *
 * Kept tiny on purpose — the adapter has no domain knowledge. The
 * use-case decides what to send; this just forwards the bytes.
 */

import { Injectable } from '@nestjs/common'
import { sendEmail } from '@sa/email'
import type { EmailPort, SendableEmail } from '../application/email-port'

@Injectable()
export class ResendEmailAdapter implements EmailPort {
  async send(input: SendableEmail): Promise<void> {
    await sendEmail({
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    })
  }
}
