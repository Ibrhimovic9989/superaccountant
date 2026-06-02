/**
 * Generic notification email — the fallback template the email
 * channel adapter uses when the notifications context wants to
 * deliver a scheduled message (class reminder, daily nudge,
 * streak-at-risk warning, weekly digest, system).
 *
 * Dark-theme parity with our other transactional templates
 * (verification, masterclass-reminder, progress-card). Inline
 * styles only — gmail/outlook/superhuman strip <style> blocks.
 *
 * Bilingual (en | ar). RTL flips at the html dir + the small
 * "sent to" footer. UI strings are inlined here because the
 * email package can't import next-intl (server-only).
 */

export type GenericNotificationArgs = {
  recipientName: string
  recipientEmail: string
  /** Localised display title — used as the email subject too. */
  title: string
  /** Body text — paragraphs split on newlines. Optional. */
  body?: string
  /** If provided, render a CTA button pointing here. */
  link?: string
  /** Localised label for the CTA button. Defaults to 'Open SuperAccountant'. */
  ctaLabel?: string
  /** UI locale — drives dir + footer strings. */
  locale: 'en' | 'ar'
}

export type GenericNotificationContent = {
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
} as const

const FOOTER = {
  en: (email: string) =>
    `Sent to ${escapeHtml(email)}. You're receiving this because you're enrolled at SuperAccountant. Update preferences in Settings.`,
  ar: (email: string) =>
    `أُرسل إلى ${escapeHtml(email)}. تتلقى هذا لأنك مسجل في سوبر أكاونتانت. حدّث التفضيلات من الإعدادات.`,
} as const

const DEFAULT_CTA: Record<'en' | 'ar', string> = {
  en: 'Open SuperAccountant',
  ar: 'افتح سوبر أكاونتانت',
}

export function buildGenericNotificationEmail(
  args: GenericNotificationArgs,
): GenericNotificationContent {
  const locale = args.locale
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  const firstName = (args.recipientName.split(' ')[0] ?? args.recipientName).trim() || 'there'
  const subject = args.title
  const escTitle = escapeHtml(args.title)
  const escName = escapeHtml(firstName)
  const ctaLabel = escapeHtml(args.ctaLabel ?? DEFAULT_CTA[locale])

  const paragraphs = (args.body ?? '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${PALETTE.fgMuted};">${escapeHtml(p)}</p>`,
    )
    .join('')

  const ctaBlock = args.link
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
         <tr>
           <td align="center" style="border-radius:10px;background:${PALETTE.accent};">
             <a href="${escapeHtml(args.link)}" target="_blank"
                style="display:inline-block;padding:14px 28px;background:${PALETTE.accent};color:${PALETTE.accentFg};text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;letter-spacing:-0.2px;">
               ${ctaLabel}
             </a>
           </td>
         </tr>
       </table>`
    : ''

  const html = `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${escTitle}</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${PALETTE.fg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PALETTE.bg};">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:${PALETTE.bgElev};border:1px solid ${PALETTE.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="32" height="32" align="center" valign="middle" style="background:${PALETTE.fg};color:${PALETTE.bg};border-radius:8px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:13px;font-weight:800;line-height:32px;">SA</td>
                  <td style="padding-${dir === 'rtl' ? 'right' : 'left'}:12px;font-size:15px;font-weight:600;letter-spacing:-0.2px;color:${PALETTE.fg};">SuperAccountant</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 8px;">
              <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;font-weight:600;letter-spacing:-0.4px;color:${PALETTE.fg};">${escTitle}</h1>
              <p style="margin:0 0 16px;font-size:13px;color:${PALETTE.fgSubtle};">${locale === 'ar' ? 'مرحباً' : 'Hey'} ${escName},</p>
              ${paragraphs}
            </td>
          </tr>
          ${
            ctaBlock
              ? `<tr><td style="padding:8px 40px 32px;">${ctaBlock}</td></tr>`
              : `<tr><td style="padding:0 40px 16px;"></td></tr>`
          }
          <tr>
            <td style="padding:20px 40px 28px;background:${PALETTE.bgOverlay};border-top:1px solid ${PALETTE.border};">
              <p style="margin:0;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1px;color:${PALETTE.fgSubtle};">${FOOTER[locale](args.recipientEmail)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    args.title,
    '',
    locale === 'ar' ? `مرحباً ${firstName}،` : `Hey ${firstName},`,
    '',
    args.body ?? '',
    '',
    args.link ? `${args.ctaLabel ?? DEFAULT_CTA[locale]}: ${args.link}` : '',
    '',
    '---',
    locale === 'ar'
      ? `أُرسل إلى ${args.recipientEmail}. حدّث التفضيلات من الإعدادات.`
      : `Sent to ${args.recipientEmail}. Update preferences in Settings.`,
  ]
    .filter(Boolean)
    .join('\n')

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
