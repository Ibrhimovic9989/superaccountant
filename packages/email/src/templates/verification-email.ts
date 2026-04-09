/**
 * Bilingual sign-in link email — branded.
 *
 * Plain HTML on purpose: keeps @sa/email dependency-free (no react-email build
 * step). Uses inline styles only — every gmail/outlook/superhuman client
 * strips <style> blocks and external CSS. Tested rendering against the major
 * clients via litmus equivalents.
 *
 * The HTML embeds either an EN or AR block depending on the recipient's
 * detected locale, with `dir="rtl"` on the AR variant.
 *
 * Per CLAUDE.md §4.3: NextAuth's email provider calls this via @sa/email's
 * sendEmail() to deliver the magic link.
 */

export type VerificationEmailArgs = {
  url: string
  email: string
  locale?: 'en' | 'ar'
  /** Optional brand override for the From / footer line. */
  brand?: string
}

export type VerificationEmailContent = { subject: string; html: string; text: string }

const COPY = {
  en: {
    subject: 'Your sign-in link to SuperAccountant',
    preheader: 'Click to sign in. This link is valid for 24 hours.',
    eyebrow: 'SIGN IN',
    heading: 'Welcome back.',
    intro:
      'Click the button below to finish signing in. We sent this link because someone (hopefully you) requested it.',
    button: 'Sign in to SuperAccountant',
    expires: 'This link expires in 24 hours and can only be used once.',
    fallbackHeading: 'Button not working?',
    fallbackBody: 'Copy and paste this link into your browser:',
    notyou: "If you didn't request this email, you can safely ignore it. Your account is secure.",
    address: 'SuperAccountant Technologies · Unit 422, 4th floor, Downtown Mall, Lakdikapul, Hyderabad',
    contact: 'Questions? Email info@superaccountant.in',
    rights: '© 2026 SuperAccountant',
  },
  ar: {
    subject: 'رابط تسجيل الدخول إلى سوبر أكاونتنت',
    preheader: 'اضغط لتسجيل الدخول. هذا الرابط صالح لمدة 24 ساعة.',
    eyebrow: 'تسجيل الدخول',
    heading: 'مرحبًا بعودتك.',
    intro: 'اضغط على الزر أدناه لإكمال تسجيل الدخول. أرسلنا هذا الرابط بناء على طلب من حسابك.',
    button: 'تسجيل الدخول إلى سوبر أكاونتنت',
    expires: 'تنتهي صلاحية هذا الرابط خلال 24 ساعة ويمكن استخدامه مرة واحدة فقط.',
    fallbackHeading: 'الزر لا يعمل؟',
    fallbackBody: 'انسخ هذا الرابط والصقه في متصفحك:',
    notyou: 'إذا لم تطلب هذا البريد الإلكتروني، يمكنك تجاهله بأمان. حسابك آمن.',
    address: 'سوبر أكاونتنت تكنولوجيز · وحدة 422، الطابق الرابع، داون تاون مول، لاكديكابول، حيدر آباد',
    contact: 'أسئلة؟ راسل info@superaccountant.in',
    rights: '© 2026 سوبر أكاونتنت',
  },
}

// Brand palette — frozen at email-safe values, not OKLCH (most clients break on it).
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

export function buildVerificationEmail(args: VerificationEmailArgs): VerificationEmailContent {
  const c = COPY[args.locale ?? 'en']
  const dir = args.locale === 'ar' ? 'rtl' : 'ltr'
  const lang = args.locale === 'ar' ? 'ar' : 'en'
  const escUrl = escapeHtml(args.url)
  const escEmail = escapeHtml(args.email)

  const html = `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${c.subject}</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${PALETTE.fg};">

  <!-- Preheader (hidden in body, shown in inbox preview) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${c.preheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PALETTE.bg};">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:${PALETTE.bgElev};border:1px solid ${PALETTE.border};border-radius:16px;overflow:hidden;">

          <!-- Header strip with brand mark -->
          <tr>
            <td style="padding:32px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="32" height="32" align="center" valign="middle" style="background:${PALETTE.fg};color:${PALETTE.bg};border-radius:8px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:13px;font-weight:800;line-height:32px;">SA</td>
                        <td style="padding-${dir === 'rtl' ? 'right' : 'left'}:12px;font-size:15px;font-weight:600;letter-spacing:-0.2px;color:${PALETTE.fg};">SuperAccountant</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 16px;">
              <p style="margin:0 0 16px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${PALETTE.fgSubtle};">${c.eyebrow}</p>
              <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;font-weight:600;letter-spacing:-0.5px;color:${PALETTE.fg};">${c.heading}</h1>
              <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:${PALETTE.fgMuted};">${c.intro}</p>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:10px;background:${PALETTE.accent};">
                    <a href="${escUrl}"
                       target="_blank"
                       style="display:inline-block;padding:14px 28px;background:${PALETTE.accent};color:${PALETTE.accentFg};text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;letter-spacing:-0.2px;">
                      ${c.button} &nbsp;→
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:${PALETTE.fgSubtle};">${c.expires}</p>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:20px 40px 32px;">
              <div style="background:${PALETTE.bgOverlay};border:1px solid ${PALETTE.border};border-radius:10px;padding:16px 18px;">
                <p style="margin:0 0 8px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${PALETTE.fgSubtle};">${c.fallbackHeading}</p>
                <p style="margin:0 0 8px;font-size:13px;color:${PALETTE.fgMuted};">${c.fallbackBody}</p>
                <p style="margin:0;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:11px;word-break:break-all;color:${PALETTE.fgMuted};direction:ltr;text-align:left;">
                  <a href="${escUrl}" style="color:${PALETTE.accent};text-decoration:none;">${escUrl}</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:${PALETTE.border};line-height:1px;font-size:0;">&nbsp;</div>
            </td>
          </tr>

          <!-- Recipient + warning -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <p style="margin:0 0 4px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${PALETTE.fgSubtle};">${args.locale === 'ar' ? 'مرسلة إلى' : 'SENT TO'}</p>
              <p style="margin:0 0 16px;font-size:13px;color:${PALETTE.fgMuted};">${escEmail}</p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:${PALETTE.fgSubtle};">${c.notyou}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;background:${PALETTE.bgOverlay};border-top:1px solid ${PALETTE.border};">
              <p style="margin:0 0 6px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1px;color:${PALETTE.fgSubtle};">${c.contact}</p>
              <p style="margin:0 0 6px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1px;color:${PALETTE.fgSubtle};">${c.address}</p>
              <p style="margin:8px 0 0;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1px;color:${PALETTE.fgSubtle};">${c.rights}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    c.heading,
    '',
    c.intro,
    '',
    `${c.button}: ${args.url}`,
    '',
    c.expires,
    '',
    `${args.locale === 'ar' ? 'مرسلة إلى' : 'Sent to'}: ${args.email}`,
    c.notyou,
    '',
    '---',
    c.contact,
    c.address,
    c.rights,
  ].join('\n')

  return { subject: c.subject, html, text }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
