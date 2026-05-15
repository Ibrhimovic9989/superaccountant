/**
 * Transactional email template for delivering a generated certificate to
 * a recipient. The subject + body are author-supplied (the user composes
 * them in the cert-builder UI); this template just wraps the body in a
 * minimal HTML shell with the logo, greeting, and a verification link.
 *
 * The PDF itself is attached as a separate file — the email body should
 * not embed the PDF inline.
 */

const LOGO_URL =
  'https://nmiiqyfwvbcvtwumtwil.supabase.co/storage/v1/object/public/logo/WhatsApp_Image_2026-05-09_at_11.23.21-removebg-preview.png'

export type CertificateEmailArgs = {
  recipientName: string
  /** Markdown-flavoured body the user composed in the cert-builder. */
  body: string
  /** Public URL where anyone can verify this certificate. */
  verifyUrl: string
}

export type CertificateEmailContent = {
  html: string
  text: string
}

/**
 * Replaces `{{name}}` and `{{recipient}}` placeholders in the body
 * with the recipient's name. Mirrors the PDF interpolation rule so the
 * user only has one syntax to learn.
 */
function interpolate(template: string, recipientName: string): string {
  return template
    .replace(/\{\{\s*name\s*\}\}/g, recipientName)
    .replace(/\{\{\s*recipient\s*\}\}/g, recipientName)
}

/** Minimal markdown → HTML — paragraph splitting and **bold** only.
 *  Avoids pulling a markdown lib for the few features we need here. */
function bodyToHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((p) =>
      p
        .replace(/\n/g, ' ')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
    )
    .map((p) => `<p style="margin:0 0 16px 0; line-height:1.6; color:#1e293b;">${p}</p>`)
    .join('')
}

export function buildCertificateEmail(args: CertificateEmailArgs): CertificateEmailContent {
  const composed = interpolate(args.body, args.recipientName)
  const bodyHtml = bodyToHtml(composed)
  const bodyText = composed

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Your certificate</title>
  </head>
  <body style="margin:0; padding:24px 16px; background:#f6f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#0f172a;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px;">
      <tr>
        <td style="padding:28px 32px 0 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
            <tr>
              <td>
                <div style="height:3px; width:120px; background:#1e5891; border-radius:2px;"></div>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px;">
                  <tr>
                    <td style="vertical-align:middle; padding-right:10px;">
                      <img src="${LOGO_URL}" alt="Super Accountant" width="32" height="32" style="display:block;" />
                    </td>
                    <td style="vertical-align:middle; font-weight:600; color:#0f2444; font-size:14px;">
                      Super Accountant
                      <div style="font-size:9px; color:#64748b; letter-spacing:1.1px; text-transform:uppercase; margin-top:2px;">— Your AI Tutor —</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px 8px 32px;">
          <p style="margin:0 0 16px 0; font-size:15px; color:#0f172a;">
            Hi ${args.recipientName.split(' ')[0] ?? args.recipientName},
          </p>
          ${bodyHtml}
          <p style="margin:24px 0 8px 0; font-size:13px; color:#475569;">
            Your certificate is attached as a PDF. You can also verify it any time at:
          </p>
          <p style="margin:0 0 24px 0;">
            <a href="${args.verifyUrl}" style="color:#1e5891; text-decoration:underline; font-size:13px; word-break:break-all;">${args.verifyUrl}</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 32px 28px 32px; border-top:1px solid #e5e7eb;">
          <p style="margin:16px 0 0 0; font-size:11px; color:#94a3b8; line-height:1.5;">
            This certificate is signed and verifiable by anyone via the link above — no login required. Keep this email for your records.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = `Hi ${args.recipientName.split(' ')[0] ?? args.recipientName},

${bodyText}

Your certificate is attached as a PDF. Verify it any time at: ${args.verifyUrl}

— Super Accountant`

  return { html, text }
}
