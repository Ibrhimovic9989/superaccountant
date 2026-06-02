/**
 * Shared layout for the three SA Cash payout transactional emails:
 *   payout-requested → confirmation that we got the request
 *   payout-paid      → cheque cut / transfer initiated
 *   payout-rejected  → request denied + points returned
 *
 * Dark-theme inline-HTML wrapper that mirrors eligibility-passed.ts so
 * the three payout templates feel like one product family.
 */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const PALETTE = {
  bg: '#0a0a0a',
  bgElev: '#161616',
  bgOverlay: '#1f1f1f',
  fg: '#fafafa',
  fgMuted: '#a1a1aa',
  fgSubtle: '#71717a',
  border: '#2a2a2a',
  accent: '#a78bfa',
  accentFg: '#0a0a0a',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
} as const

export type EyebrowTone = 'success' | 'warning' | 'danger'

export type PayoutEmailLayoutArgs = {
  subject: string
  preheader: string
  eyebrow: string
  eyebrowTone: EyebrowTone
  heading: string
  intro: string
  /** The "amount card" — large amount + secondary line. */
  amountLabel: string
  amountValue: string
  amountSubtext: string
  /** Optional notes block beneath the amount card (already HTML-escaped). */
  detailsHtml?: string
  /** Optional CTA. When provided, renders as a primary button. */
  ctaUrl?: string
  ctaLabel?: string
  /** Footer line — who this was sent to. */
  recipientFullName: string
}

export function renderPayoutEmail(args: PayoutEmailLayoutArgs): string {
  const tone =
    args.eyebrowTone === 'success'
      ? PALETTE.success
      : args.eyebrowTone === 'warning'
        ? PALETTE.warning
        : PALETTE.danger
  const detailsBlock = args.detailsHtml
    ? `<tr><td style="padding:0 40px 24px;">${args.detailsHtml}</td></tr>`
    : ''
  const cta =
    args.ctaUrl && args.ctaLabel
      ? `
        <tr>
          <td style="padding:0 40px 8px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="border-radius:10px;background:${PALETTE.accent};">
                  <a href="${escapeHtml(args.ctaUrl)}" target="_blank"
                     style="display:inline-block;padding:14px 28px;background:${PALETTE.accent};color:${PALETTE.accentFg};text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;letter-spacing:-0.2px;">
                    ${escapeHtml(args.ctaLabel)} &nbsp;→
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
      : ''

  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${escapeHtml(args.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${PALETTE.fg};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(args.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PALETTE.bg};">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:${PALETTE.bgElev};border:1px solid ${PALETTE.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="32" height="32" align="center" valign="middle" style="background:${PALETTE.fg};color:${PALETTE.bg};border-radius:8px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:13px;font-weight:800;line-height:32px;">SA</td>
                  <td style="padding-left:12px;font-size:15px;font-weight:600;letter-spacing:-0.2px;color:${PALETTE.fg};">SuperAccountant</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 8px;">
              <p style="margin:0 0 16px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${tone};">${escapeHtml(args.eyebrow)}</p>
              <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;font-weight:600;letter-spacing:-0.5px;color:${PALETTE.fg};">${escapeHtml(args.heading)}</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${PALETTE.fgMuted};">${escapeHtml(args.intro)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PALETTE.bgOverlay};border:1px solid ${PALETTE.border};border-radius:12px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <p style="margin:0;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${PALETTE.fgSubtle};">${escapeHtml(args.amountLabel)}</p>
                    <p style="margin:6px 0 0;font-size:28px;font-weight:600;color:${PALETTE.fg};">${escapeHtml(args.amountValue)}</p>
                    <p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:${PALETTE.fgMuted};">${escapeHtml(args.amountSubtext)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${detailsBlock}
          ${cta}
          <tr>
            <td style="padding:20px 40px 32px;background:${PALETTE.bgOverlay};border-top:1px solid ${PALETTE.border};">
              <p style="margin:0 0 6px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1px;color:${PALETTE.fgSubtle};">Sent to ${escapeHtml(args.recipientFullName)}.</p>
              <p style="margin:0 0 6px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1px;color:${PALETTE.fgSubtle};">Questions? Email info@superaccountant.in</p>
              <p style="margin:8px 0 0;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1px;color:${PALETTE.fgSubtle};">© 2026 SuperAccountant</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** Format major-unit currency. Whole units only (matches SA conversion). */
export function formatAmount(amountMinor: number, currency: 'INR' | 'SAR'): string {
  const major = Math.round(amountMinor / 100)
  return currency === 'INR' ? `₹${major.toLocaleString('en-IN')}` : `﷼${major.toLocaleString()}`
}
