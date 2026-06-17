/**
 * Cohort graduation email — sent once at certificate issuance.
 *
 * Bundles BOTH credentials the student walks out with:
 *   1. Certificate (verifies pass + score)
 *   2. Learning curve report (verifies phase-by-phase mastery + trajectory)
 *
 * Both verify URLs + both PDFs land in a single recruiter-shareable
 * email so the student doesn't have to assemble the package themselves.
 * Per CA Muneer (founder voice note, 2026-06-17): "the certificate
 * goes with the learning curve so recruiters can size them up without
 * re-assessing."
 *
 * Bilingual — picks the EN or AR shell based on the student's locale.
 * Attachments are added by the sender (apps/web/src/lib/credentials/
 * issue.ts); this template only renders subject + html + text.
 */

const LOGO_URL =
  'https://nmiiqyfwvbcvtwumtwil.supabase.co/storage/v1/object/public/logo/WhatsApp_Image_2026-05-09_at_11.23.21-removebg-preview.png'

export type CohortGraduationEmailArgs = {
  recipientName: string
  /** 0..1, the grand-test score. Rendered as a percent. */
  scorePct: number
  /** Public HMAC-signed verify page for the certificate. */
  certVerifyUrl: string
  /** Public HMAC-signed verify page for the learning curve PDF. */
  curveVerifyUrl: string
  /** Locale of the rendered email. */
  locale: 'en' | 'ar'
}

export type CohortGraduationEmailContent = {
  subject: string
  html: string
  text: string
}

export function buildCohortGraduationEmail(
  args: CohortGraduationEmailArgs,
): CohortGraduationEmailContent {
  const firstName = args.recipientName.split(' ')[0] ?? args.recipientName
  const score = Math.round(args.scorePct)
  const dir = args.locale === 'ar' ? 'rtl' : 'ltr'
  const t = COPY[args.locale]

  const subject = t.subject(firstName, score)
  const text = t.text({ name: firstName, score, ...args })
  const html = t.html({ name: firstName, score, dir, ...args })

  return { subject, text, html }
}

const COPY = {
  en: {
    subject: (name: string, score: number) =>
      `${name} — your SuperAccountant certificate + learning curve (${score}%)`,
    text: (a: {
      name: string
      score: number
      certVerifyUrl: string
      curveVerifyUrl: string
    }) =>
      [
        `Hi ${a.name},`,
        '',
        `You passed the SuperAccountant grand test with ${a.score}%.`,
        '',
        'Two things land with this email — both signed by SuperAccountant',
        'and verifiable by anyone with the link:',
        '',
        '1. Certificate (attached as a PDF)',
        `   Verify online: ${a.certVerifyUrl}`,
        '',
        '2. Learning curve report (attached as a PDF)',
        `   Verify online: ${a.curveVerifyUrl}`,
        '',
        'The certificate tells a recruiter you passed. The learning',
        'curve shows them how — every phase, every subject, your',
        'mastery over time. Send both together when you apply.',
        '',
        'You can also find both inside the app at app.superaccountant.in/en/my-progress —',
        'with one-click "share with recruiter" links.',
        '',
        'Mubarak — go take that interview.',
        '',
        'The SuperAccountant Team',
      ].join('\n'),
    html: (a: {
      name: string
      score: number
      dir: 'ltr' | 'rtl'
      certVerifyUrl: string
      curveVerifyUrl: string
    }) =>
      htmlShell({
        dir: a.dir,
        lang: 'en',
        title: `Congratulations, ${a.name}`,
        intro: `You passed the SuperAccountant grand test with <b>${a.score}%</b>.`,
        body: `
          <p style="margin:0 0 12px 0">Two things land with this email — both signed by SuperAccountant and verifiable by anyone with the link.</p>

          ${credCard({
            ord: '1',
            heading: 'Certificate',
            blurb: 'Proves you passed. PDF attached.',
            verifyUrl: a.certVerifyUrl,
            label: 'Verify certificate',
          })}

          ${credCard({
            ord: '2',
            heading: 'Learning curve report',
            blurb: 'Phase-by-phase mastery + your trajectory over the cohort. PDF attached.',
            verifyUrl: a.curveVerifyUrl,
            label: 'Verify learning curve',
          })}

          <p style="margin:24px 0 6px 0;color:#3f3f46;font-size:14px;line-height:1.5">
            <b>How to use this with recruiters.</b> Send both links in a single email. The
            certificate confirms the pass; the learning curve shows how you got there —
            every phase, every subject. They can verify both in one click.
          </p>

          <p style="margin:16px 0 0 0">
            You can also find both inside the app at
            <a href="https://app.superaccountant.in/en/my-progress" style="color:#7c3aed;text-decoration:none">app.superaccountant.in/en/my-progress</a>
            with one-click share buttons.
          </p>

          <p style="margin:28px 0 0 0">Mubarak — go take that interview.</p>
        `,
        signoff: 'The SuperAccountant Team',
      }),
  },

  ar: {
    subject: (name: string, score: number) =>
      `${name} — شهادة سوبر أكاونتنت + منحنى التعلم (${score}٪)`,
    text: (a: {
      name: string
      score: number
      certVerifyUrl: string
      curveVerifyUrl: string
    }) =>
      [
        `مرحباً ${a.name}،`,
        '',
        `لقد اجتزت اختبار سوبر أكاونتنت النهائي بنسبة ${a.score}٪.`,
        '',
        'تجد في هذا البريد شيئين — كلاهما موقّعان من سوبر أكاونتنت',
        'ويمكن لأي شخص التحقق منهما عبر الرابط:',
        '',
        '١. الشهادة (مرفقة بصيغة PDF)',
        `   التحقق عبر الإنترنت: ${a.certVerifyUrl}`,
        '',
        '٢. تقرير منحنى التعلم (مرفق بصيغة PDF)',
        `   التحقق عبر الإنترنت: ${a.curveVerifyUrl}`,
        '',
        'الشهادة تخبر المسؤول عن التوظيف بأنك نجحت.',
        'منحنى التعلم يوضح كيف نجحت — كل مرحلة، كل مادة، وإتقانك',
        'بمرور الوقت. أرسل الاثنين معاً عند التقديم.',
        '',
        'يمكنك أيضاً العثور على الاثنين داخل التطبيق على',
        'app.superaccountant.in/ar/my-progress — مع أزرار مشاركة بنقرة واحدة.',
        '',
        'مبروك — اذهب وأنجز تلك المقابلة.',
        '',
        'فريق سوبر أكاونتنت',
      ].join('\n'),
    html: (a: {
      name: string
      score: number
      dir: 'ltr' | 'rtl'
      certVerifyUrl: string
      curveVerifyUrl: string
    }) =>
      htmlShell({
        dir: a.dir,
        lang: 'ar',
        title: `مبروك يا ${a.name}`,
        intro: `لقد اجتزت اختبار سوبر أكاونتنت النهائي بنسبة <b>${a.score}٪</b>.`,
        body: `
          <p style="margin:0 0 12px 0">يصلك مع هذا البريد شيئان — كلاهما موقّعان من سوبر أكاونتنت ويمكن لأي شخص التحقق منهما عبر الرابط.</p>

          ${credCard({
            ord: '١',
            heading: 'الشهادة',
            blurb: 'تثبت نجاحك. ملف PDF مرفق.',
            verifyUrl: a.certVerifyUrl,
            label: 'التحقق من الشهادة',
          })}

          ${credCard({
            ord: '٢',
            heading: 'تقرير منحنى التعلم',
            blurb: 'إتقانك مرحلة بمرحلة + مسارك خلال الدورة. ملف PDF مرفق.',
            verifyUrl: a.curveVerifyUrl,
            label: 'التحقق من منحنى التعلم',
          })}

          <p style="margin:24px 0 6px 0;color:#3f3f46;font-size:14px;line-height:1.5">
            <b>كيف تستخدم هذا مع المسؤولين عن التوظيف.</b> أرسل كلا الرابطين في بريد واحد.
            الشهادة تؤكد النجاح؛ منحنى التعلم يوضح كيف وصلت إلى هذا —
            كل مرحلة، كل مادة. يمكنهم التحقق من الاثنين بنقرة واحدة.
          </p>

          <p style="margin:16px 0 0 0">
            يمكنك أيضاً العثور على الاثنين داخل التطبيق على
            <a href="https://app.superaccountant.in/ar/my-progress" style="color:#7c3aed;text-decoration:none">app.superaccountant.in/ar/my-progress</a>
            مع أزرار مشاركة بنقرة واحدة.
          </p>

          <p style="margin:28px 0 0 0">مبروك — اذهب وأنجز تلك المقابلة.</p>
        `,
        signoff: 'فريق سوبر أكاونتنت',
      }),
  },
} as const

// ──────────────────────────────────────────────────────────────
// Shared HTML chrome — both languages use the same shell, just with
// dir + lang flipped. Inline styles only so Resend → Gmail/Outlook
// don't strip them.
// ──────────────────────────────────────────────────────────────

function htmlShell(opts: {
  dir: 'ltr' | 'rtl'
  lang: 'en' | 'ar'
  title: string
  intro: string
  body: string
  signoff: string
}): string {
  return `<!doctype html>
<html lang="${opts.lang}" dir="${opts.dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  <body style="margin:0;background:#fafafa;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#18181b">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;padding:32px 16px">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
            <tr>
              <td style="padding:28px 32px 4px 32px">
                <img src="${LOGO_URL}" alt="SuperAccountant" width="44" height="44" style="display:block" />
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 4px 32px">
                <h1 style="margin:0 0 8px 0;font-size:24px;line-height:1.3;color:#18181b">${opts.title}</h1>
                <p style="margin:0 0 18px 0;font-size:15px;color:#52525b">${opts.intro}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px 32px">
                ${opts.body}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 28px 32px;border-top:1px solid #e4e4e7">
                <p style="margin:0;font-size:13px;color:#71717a">${opts.signoff}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function credCard(opts: {
  ord: string
  heading: string
  blurb: string
  verifyUrl: string
  label: string
}): string {
  return `<div style="margin:14px 0;padding:16px;border:1px solid #e4e4e7;border-radius:10px;background:#fafafa">
    <div style="display:flex;align-items:center;gap:10px">
      <span style="display:inline-block;min-width:24px;height:24px;line-height:24px;text-align:center;border-radius:6px;background:#7c3aed;color:#ffffff;font-size:12px;font-weight:600">${opts.ord}</span>
      <strong style="font-size:15px;color:#18181b">${opts.heading}</strong>
    </div>
    <p style="margin:6px 0 12px 34px;font-size:13px;color:#52525b;line-height:1.5">${opts.blurb}</p>
    <p style="margin:0 0 0 34px">
      <a href="${opts.verifyUrl}" style="display:inline-block;padding:8px 14px;background:#18181b;color:#ffffff;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500">${opts.label}</a>
    </p>
    <p style="margin:8px 0 0 34px;font-size:11px;color:#a1a1aa;font-family:ui-monospace,Menlo,monospace;word-break:break-all">${opts.verifyUrl}</p>
  </div>`
}
