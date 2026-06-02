/**
 * Sent when admin rejects a payout in /admin/payouts. Explains the
 * reason (admin-entered) and reassures the student that the SA Points
 * have been returned to their wallet automatically.
 */

import { escapeHtml, formatAmount, renderPayoutEmail } from './payout-shared'

export type PayoutRejectedEmailArgs = {
  recipientName: string
  points: number
  amountMinor: number
  currency: 'INR' | 'SAR'
  reason: string
  /** Locale-aware URL back to the rewards page so they can re-request. */
  rewardsUrl: string
}

export type PayoutRejectedEmailContent = {
  subject: string
  html: string
  text: string
}

export function buildPayoutRejectedEmail(
  args: PayoutRejectedEmailArgs,
): PayoutRejectedEmailContent {
  const firstName = args.recipientName.split(' ')[0] ?? args.recipientName
  const amount = formatAmount(args.amountMinor, args.currency)
  const subject = `Your ${amount} SA Cash payout request couldn't be processed`

  const detailsHtml = `
    <div style="background:#1f1f1f;border:1px solid #2a2a2a;border-radius:10px;padding:16px 18px;">
      <p style="margin:0 0 6px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#71717a;">Reason</p>
      <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#fafafa;">${escapeHtml(args.reason)}</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#a1a1aa;">
        Good news: <strong style="color:#10b981;">${escapeHtml(String(args.points))} SA Points</strong> have been returned to your wallet. You can submit a new request anytime, or keep them for your next cohort discount.
      </p>
    </div>`

  const html = renderPayoutEmail({
    subject,
    preheader: `${args.points} SA Points have been returned to your wallet.`,
    eyebrow: 'PAYOUT REJECTED · POINTS REFUNDED',
    eyebrowTone: 'danger',
    heading: `Sorry, ${firstName} — we couldn't process this one.`,
    intro:
      'Your SA Cash payout request was rejected. Your points are already back in your wallet, so nothing is lost.',
    amountLabel: 'REQUESTED AMOUNT',
    amountValue: amount,
    amountSubtext: `${args.points.toLocaleString()} SA Points have been refunded to your wallet.`,
    detailsHtml,
    ctaUrl: args.rewardsUrl,
    ctaLabel: 'Open my wallet',
    recipientFullName: args.recipientName,
  })

  const text = [
    `Hi ${firstName},`,
    '',
    `Your SA Cash payout request of ${amount} (${args.points} SA Points) was rejected.`,
    '',
    `Reason: ${args.reason}`,
    '',
    `Your ${args.points} SA Points have been returned to your wallet. You can submit a new request anytime, or keep them for your next cohort discount.`,
    '',
    `Wallet: ${args.rewardsUrl}`,
    '',
    '— SuperAccountant',
  ].join('\n')

  return { subject, html, text }
}
