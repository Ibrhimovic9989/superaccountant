/**
 * Sent when admin marks a payout as 'paid' in /admin/payouts. Confirms
 * the cheque has been issued / transfer initiated and includes the
 * admin-entered reference (cheque #, UTR, transaction id).
 */

import { escapeHtml, formatAmount, renderPayoutEmail } from './payout-shared'

export type PayoutPaidEmailArgs = {
  recipientName: string
  amountMinor: number
  currency: 'INR' | 'SAR'
  /** Free-form admin notes — cheque number, UTR, or transfer id. */
  reference: string | null
}

export type PayoutPaidEmailContent = {
  subject: string
  html: string
  text: string
}

export function buildPayoutPaidEmail(args: PayoutPaidEmailArgs): PayoutPaidEmailContent {
  const firstName = args.recipientName.split(' ')[0] ?? args.recipientName
  const amount = formatAmount(args.amountMinor, args.currency)
  const subject = `Your ${amount} SA Cash payout has been sent`

  const trimmedRef = args.reference?.trim() ?? ''
  const layoutArgs = {
    subject,
    preheader: `${amount} sent. Keep this email for your records.`,
    eyebrow: 'PAYOUT COMPLETED',
    eyebrowTone: 'success' as const,
    heading: `${amount} is on its way.`,
    intro: `Hi ${firstName}, your SA Cash payout has been issued. Keep this email for your records — it's your proof of payment.`,
    amountLabel: 'AMOUNT PAID',
    amountValue: amount,
    amountSubtext: 'Cheque cut or transfer initiated using the bank details you provided.',
    recipientFullName: args.recipientName,
    ...(trimmedRef
      ? {
          detailsHtml: `<div style="background:#1f1f1f;border:1px solid #2a2a2a;border-radius:10px;padding:16px 18px;">
         <p style="margin:0 0 6px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#71717a;">Reference</p>
         <p style="margin:0;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.6;color:#fafafa;word-break:break-all;">${escapeHtml(trimmedRef)}</p>
       </div>`,
        }
      : {}),
  }
  const html = renderPayoutEmail(layoutArgs)

  const text = [
    `Hi ${firstName},`,
    '',
    `Your SA Cash payout of ${amount} has been issued.`,
    args.reference?.trim() ? `Reference: ${args.reference.trim()}` : '',
    '',
    "Keep this email for your records — it's your proof of payment. If you don't see the funds within 5 business days, reply and we'll trace it.",
    '',
    '— SuperAccountant',
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html, text }
}
