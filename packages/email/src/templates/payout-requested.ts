/**
 * Sent to a student the moment they submit a cheque-payout request on
 * /rewards/payout. Confirms receipt + sets the 5-business-day SLA so
 * they know not to ask "did it go through?" the next day.
 */

import { escapeHtml, formatAmount, renderPayoutEmail } from './payout-shared'

export type PayoutRequestedEmailArgs = {
  recipientName: string
  points: number
  amountMinor: number
  currency: 'INR' | 'SAR'
}

export type PayoutRequestedEmailContent = {
  subject: string
  html: string
  text: string
}

export function buildPayoutRequestedEmail(
  args: PayoutRequestedEmailArgs,
): PayoutRequestedEmailContent {
  const firstName = args.recipientName.split(' ')[0] ?? args.recipientName
  const amount = formatAmount(args.amountMinor, args.currency)
  const subject = `We received your ${amount} SA Cash payout request`

  const detailsHtml = `
    <div style="background:#1f1f1f;border:1px solid #2a2a2a;border-radius:10px;padding:16px 18px;">
      <p style="margin:0 0 6px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#71717a;">What happens next</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#a1a1aa;">
        Our team verifies the request, cuts the cheque or initiates the bank transfer, and emails you a reference. Most payouts complete within <strong style="color:#fafafa;">5 business days</strong>. The ${escapeHtml(String(args.points))} SA Points are already debited from your wallet — if we reject for any reason they'll be returned automatically.
      </p>
    </div>`

  const html = renderPayoutEmail({
    subject,
    preheader: `Your ${amount} SA Cash payout request is in our queue.`,
    eyebrow: 'PAYOUT REQUESTED · PROCESSING',
    eyebrowTone: 'warning',
    heading: `We've got it, ${firstName}.`,
    intro:
      'Your SA Cash payout request is in our queue. Expect a cheque or bank transfer within 5 business days.',
    amountLabel: `YOU REQUESTED · ${args.points.toLocaleString()} SA POINTS`,
    amountValue: amount,
    amountSubtext: 'Will be paid by cheque or direct transfer using the bank details you provided.',
    detailsHtml,
    recipientFullName: args.recipientName,
  })

  const text = [
    `Hi ${firstName},`,
    '',
    `We received your SA Cash payout request: ${amount} (${args.points} SA Points).`,
    '',
    'What happens next: we verify the request, cut the cheque or initiate the bank transfer, and email you a reference. Most payouts complete within 5 business days.',
    '',
    "Your points are already debited — if the request is rejected for any reason, they'll be returned automatically.",
    '',
    '— SuperAccountant',
  ].join('\n')

  return { subject, html, text }
}
