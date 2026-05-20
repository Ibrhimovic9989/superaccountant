/**
 * Transactional email sent immediately after a candidate completes the
 * cohort eligibility test on /quiz. Congratulates them on becoming
 * eligible and links them to the cohort apply page.
 *
 * Plain HTML, inline-styled only — matches the verification email style
 * so it renders cleanly across Gmail / Outlook / Superhuman without a
 * react-email build step.
 */

export type EligibilityPassedEmailArgs = {
  /** Recipient's display name. Used in the greeting. */
  recipientName: string
  /** Their score on the eligibility test (out of `maxScore`). */
  score: number
  maxScore: number
  /** The bucket they landed in — title + emoji shown in the email card. */
  bucketTitle: string
  bucketEmoji: string
  /** Headline copy for the bucket — shown as the secondary message. */
  bucketHeadline: string
  /** Absolute URL to the cohort apply page. */
  cohortUrl: string
}

export type EligibilityPassedEmailContent = {
  subject: string
  html: string
  text: string
}

const PALETTE = {
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
  successSoft: 'rgba(16,185,129,0.12)',
}

export function buildEligibilityPassedEmail(
  args: EligibilityPassedEmailArgs,
): EligibilityPassedEmailContent {
  const firstName = args.recipientName.split(' ')[0] ?? args.recipientName
  const subject = `🎉 You're eligible for the SuperAccountant cohort, ${firstName}`
  const escName = escapeHtml(firstName)
  const escFullName = escapeHtml(args.recipientName)
  const escBucket = escapeHtml(args.bucketTitle)
  const escEmoji = escapeHtml(args.bucketEmoji)
  const escHeadline = escapeHtml(args.bucketHeadline)
  const escUrl = escapeHtml(args.cohortUrl)
  const score = `${args.score}/${args.maxScore}`

  const html = `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${PALETTE.fg};">

  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">You passed the eligibility test. Reserve your cohort seat now.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PALETTE.bg};">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:${PALETTE.bgElev};border:1px solid ${PALETTE.border};border-radius:16px;overflow:hidden;">

          <!-- Brand strip -->
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

          <!-- Eligibility hero -->
          <tr>
            <td style="padding:36px 40px 8px;">
              <p style="margin:0 0 16px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${PALETTE.success};">ELIGIBLE · COHORT ACCESS UNLOCKED</p>
              <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;font-weight:600;letter-spacing:-0.5px;color:${PALETTE.fg};">Congratulations, ${escName}.</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${PALETTE.fgMuted};">You completed the SuperAccountant cohort eligibility test and you're in. Your seat in the next cohort is yours to claim.</p>
            </td>
          </tr>

          <!-- Score card -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PALETTE.bgOverlay};border:1px solid ${PALETTE.border};border-radius:12px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="vertical-align:middle;font-size:32px;line-height:1;width:48px;">${escEmoji}</td>
                        <td style="padding-left:14px;vertical-align:middle;">
                          <p style="margin:0;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${PALETTE.fgSubtle};">YOUR TIER · ${escapeHtml(score)}</p>
                          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:${PALETTE.fg};">${escBucket}</p>
                          <p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:${PALETTE.fgMuted};">${escHeadline}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:10px;background:${PALETTE.accent};">
                    <a href="${escUrl}"
                       target="_blank"
                       style="display:inline-block;padding:14px 28px;background:${PALETTE.accent};color:${PALETTE.accentFg};text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;letter-spacing:-0.2px;">
                      Reserve my cohort seat &nbsp;→
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0;font-size:13px;color:${PALETTE.fgSubtle};">Seats are limited to 30 per cohort. Pay via Razorpay (UPI / cards / EMI) and you're in.</p>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <div style="background:${PALETTE.bgOverlay};border:1px solid ${PALETTE.border};border-radius:10px;padding:16px 18px;">
                <p style="margin:0 0 8px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${PALETTE.fgSubtle};">Button not working?</p>
                <p style="margin:0 0 8px;font-size:13px;color:${PALETTE.fgMuted};">Copy and paste this link into your browser:</p>
                <p style="margin:0;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:11px;word-break:break-all;color:${PALETTE.fgMuted};direction:ltr;text-align:left;">
                  <a href="${escUrl}" style="color:${PALETTE.accent};text-decoration:none;">${escUrl}</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;background:${PALETTE.bgOverlay};border-top:1px solid ${PALETTE.border};">
              <p style="margin:0 0 6px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1px;color:${PALETTE.fgSubtle};">Sent to ${escFullName} after passing the cohort eligibility test.</p>
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

  const text = [
    `Congratulations, ${firstName}.`,
    '',
    "You passed the SuperAccountant cohort eligibility test — you're in.",
    '',
    `Your tier: ${args.bucketEmoji} ${args.bucketTitle} (${score})`,
    args.bucketHeadline,
    '',
    `Reserve your cohort seat: ${args.cohortUrl}`,
    '',
    'Seats are limited to 30 per cohort. Pay via Razorpay (UPI / cards / EMI).',
    '',
    '---',
    'Questions? Email info@superaccountant.in',
    '© 2026 SuperAccountant',
  ].join('\n')

  return { subject, html, text }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
