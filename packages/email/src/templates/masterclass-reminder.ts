/**
 * Reminder email for the GST & TDS Masterclass on 25 May 2026.
 * Sent the day before the event to everyone who registered via the
 * forms.gle response sheet.
 *
 * Matches the dark-theme verification/eligibility email style. Inline
 * styles only — every gmail/outlook/superhuman client strips <style>
 * blocks. The poster image is referenced via cid: and attached as an
 * inline attachment by the sender (scripts/send-masterclass-reminder.mjs).
 */

export type MasterclassReminderArgs = {
  /** Recipient's display name from the form response. */
  recipientName: string
  /** Recipient's email — shown in the "sent to" footer line. */
  recipientEmail: string
  /** Public registration URL (forms.gle). */
  registerUrl: string
  /** cid: reference for the inline poster image. */
  posterCid: string
}

export type MasterclassReminderContent = {
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
}

export function buildMasterclassReminderEmail(
  args: MasterclassReminderArgs,
): MasterclassReminderContent {
  const firstName = (args.recipientName.split(' ')[0] ?? args.recipientName).trim() || 'there'
  const subject = `Tomorrow, 10 AM — GST & TDS Masterclass (${firstName}, your seat is held)`
  const escName = escapeHtml(firstName)
  const escEmail = escapeHtml(args.recipientEmail)
  const escUrl = escapeHtml(args.registerUrl)
  const escCid = escapeHtml(args.posterCid)

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

  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Tomorrow at 10 AM. 4th Floor, Downtown Mall, Lakdikapul. Bring your laptop.</div>

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
              <p style="margin:0 0 16px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${PALETTE.accent};">REMINDER · MASTERCLASS TOMORROW</p>
              <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;font-weight:600;letter-spacing:-0.5px;color:${PALETTE.fg};">${escName}, tomorrow at 10 AM.</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${PALETTE.fgMuted};">Quick reminder — you're registered for the free <strong style="color:${PALETTE.fg};font-weight:600;">GST &amp; TDS Masterclass</strong>. Three hours, live, no jargon. Your seat is held.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 24px;">
              <img src="cid:${escCid}" alt="GST &amp; TDS Masterclass — 25 May 2026, 10 AM, Downtown Mall Lakdikapul" width="480" style="display:block;width:100%;max-width:480px;height:auto;border-radius:12px;border:1px solid ${PALETTE.border};" />
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PALETTE.bgOverlay};border:1px solid ${PALETTE.border};border-radius:12px;">
                <tr>
                  <td style="padding:18px 22px;">
                    <p style="margin:0 0 4px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${PALETTE.fgSubtle};">DATE</p>
                    <p style="margin:0 0 14px;font-size:14px;color:${PALETTE.fg};">Monday, 25 May 2026</p>
                    <p style="margin:0 0 4px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${PALETTE.fgSubtle};">TIME</p>
                    <p style="margin:0 0 14px;font-size:14px;color:${PALETTE.fg};">10:00 AM &ndash; 1:00 PM</p>
                    <p style="margin:0 0 4px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${PALETTE.fgSubtle};">VENUE</p>
                    <p style="margin:0 0 14px;font-size:14px;color:${PALETTE.fg};">4th Floor, Downtown Mall, Lakdikapul, Hyderabad</p>
                    <p style="margin:0 0 4px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${PALETTE.fgSubtle};">BRING</p>
                    <p style="margin:0;font-size:14px;color:${PALETTE.fg};">Your laptop. That's it.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 8px;">
              <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:${PALETTE.fgMuted};">By the end of the session you'll know how GST returns actually work, the TDS sections that matter, and you'll see a live demo of the AI agent we're building for accountants.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:10px;background:${PALETTE.accent};">
                    <a href="${escUrl}"
                       target="_blank"
                       style="display:inline-block;padding:14px 28px;background:${PALETTE.accent};color:${PALETTE.accentFg};text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;letter-spacing:-0.2px;">
                      Confirm my seat &nbsp;&rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0;font-size:13px;color:${PALETTE.fgSubtle};">Can't make it? Just reply to this email and we'll free your seat for someone on the waitlist.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px 32px;">
              <div style="background:${PALETTE.bgOverlay};border:1px solid ${PALETTE.border};border-radius:10px;padding:16px 18px;">
                <p style="margin:0 0 8px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${PALETTE.fgSubtle};">Need help finding the venue?</p>
                <p style="margin:0;font-size:13px;color:${PALETTE.fgMuted};">Call or WhatsApp <a href="tel:+918106138866" style="color:${PALETTE.accent};text-decoration:none;">+91 81061 38866</a>. We're on the 4th floor of Downtown Mall, opposite Lakdikapul metro station.</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px 32px;background:${PALETTE.bgOverlay};border-top:1px solid ${PALETTE.border};">
              <p style="margin:0 0 6px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1px;color:${PALETTE.fgSubtle};">Sent to ${escEmail}. You registered via forms.gle for the GST &amp; TDS Masterclass.</p>
              <p style="margin:0 0 6px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1px;color:${PALETTE.fgSubtle};">Questions? Reply to this email or write to info@superaccountant.in</p>
              <p style="margin:8px 0 0;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1px;color:${PALETTE.fgSubtle};">SuperAccountant Technologies &middot; Unit 422, Downtown Mall, Lakdikapul, Hyderabad &middot; &copy; 2026</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    `${firstName}, tomorrow at 10 AM.`,
    '',
    "Quick reminder — you're registered for the free GST & TDS Masterclass. Three hours, live, no jargon. Your seat is held.",
    '',
    'Date:  Monday, 25 May 2026',
    'Time:  10:00 AM – 1:00 PM',
    'Venue: 4th Floor, Downtown Mall, Lakdikapul, Hyderabad',
    'Bring: Your laptop.',
    '',
    "By the end you'll know how GST returns actually work, the TDS sections that matter, and you'll see a live demo of the AI agent we're building for accountants.",
    '',
    `Confirm your seat: ${args.registerUrl}`,
    '',
    "Can't make it? Just reply to this email and we'll free your seat for someone on the waitlist.",
    '',
    'Need help finding the venue? Call or WhatsApp +91 81061 38866.',
    '',
    '---',
    `Sent to ${args.recipientEmail}.`,
    'Questions? Reply here or write to info@superaccountant.in',
    'SuperAccountant Technologies · Unit 422, Downtown Mall, Lakdikapul, Hyderabad · © 2026',
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
