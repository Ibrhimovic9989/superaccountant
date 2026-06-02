/**
 * Progress-card email — sent once after every assessment submission
 * (entry test, daily assignment, grand test). The student gets a
 * closed-loop digest: score, weak topics, and at most three "redo
 * this lesson" CTAs.
 *
 * Plain inline-styled HTML to match the rest of the @sa/email
 * templates (no react-email build step). Dark palette + RTL switch
 * when locale === 'ar'.
 *
 * The template is a pure function. Idempotency + Resend send-through
 * live in the assessment context — this file just produces the bytes.
 */

export type ProgressAssessmentKind = 'entry-test' | 'daily-assignment' | 'grand-test'

export type ProgressRedoLink = {
  title: string
  url: string
}

export type ProgressCardEmailArgs = {
  recipientName: string
  recipientEmail: string
  assessmentKind: ProgressAssessmentKind
  /** 0..100 — caller is responsible for the conversion from raw score. */
  scorePct: number
  /** Grand-test only. Drives the "you passed" vs "your result" subject. */
  passed?: boolean
  totalQuestions: number
  correctCount: number
  /** Up to 5; rendered as chips. */
  weakTopics: string[]
  /** Up to 3; rendered as a list. Caller passes [] when unresolved. */
  redoLinks?: ProgressRedoLink[]
  dashboardUrl: string
  locale: 'en' | 'ar'
}

export type ProgressCardEmailContent = {
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
  warn: '#f59e0b',
} as const

const COPY = {
  en: {
    eyebrow: {
      'entry-test': 'PLACEMENT TEST · COMPLETE',
      'daily-assignment': "TODAY'S ASSIGNMENT · COMPLETE",
      'grand-test': 'GRAND TEST · COMPLETE',
    },
    scoreLabel: 'YOUR SCORE',
    weakLabel: 'TOPICS TO REVISIT',
    redoLabel: 'PICK UP WHERE YOU LEFT OFF',
    noWeak: 'No weak topics this round — solid work.',
    cta: 'Go to dashboard',
    grandPassed: "You're certified! See the next steps in your dashboard.",
    grandFailed: "Not quite this time — let's tighten up the weak topics and try again.",
    daily: "Here's how today's assignment landed.",
    entry: "You've been placed in your track. Keep the momentum going.",
    footerSent: (name: string) => `Sent to ${name} after submitting an assessment.`,
    contact: 'Questions? Email info@superaccountant.in',
    rights: '© 2026 SuperAccountant',
  },
  ar: {
    eyebrow: {
      'entry-test': 'اختبار التحديد · مكتمل',
      'daily-assignment': 'مهمة اليوم · مكتملة',
      'grand-test': 'الاختبار الكبير · مكتمل',
    },
    scoreLabel: 'نتيجتك',
    weakLabel: 'موضوعات للمراجعة',
    redoLabel: 'تابع من حيث توقفت',
    noWeak: 'لا توجد موضوعات ضعيفة هذه الجولة — أداء ممتاز.',
    cta: 'انتقل إلى لوحة التحكم',
    grandPassed: 'مبروك! اطلع على الخطوات التالية في لوحة التحكم.',
    grandFailed: 'لم تنجح هذه المرة — لنركّز على الموضوعات الضعيفة ونعيد المحاولة.',
    daily: 'إليك ملخص مهمة اليوم.',
    entry: 'تم تحديد مستواك في المسار. حافظ على الزخم.',
    footerSent: (name: string) => `أُرسل إلى ${name} بعد تسليم تقييم.`,
    contact: 'أسئلة؟ راسل info@superaccountant.in',
    rights: '© 2026 سوبر أكاونتنت',
  },
} as const

function buildSubject(args: ProgressCardEmailArgs): string {
  const pct = Math.round(args.scorePct)
  if (args.assessmentKind === 'entry-test') {
    const phase = phaseFromScore(args.scorePct)
    return `Your placement test result — Phase ${phase} unlocked`
  }
  if (args.assessmentKind === 'daily-assignment') {
    return `Today's progress · ${args.correctCount}/${args.totalQuestions} correct`
  }
  // grand-test
  if (args.passed) return 'You passed the SuperAccountant grand test'
  return `Your grand test result — score ${pct}%`
}

/** Maps a 0..100 score to a 1..4 phase placement, mirroring the
 *  EntryTestService computePlacement bands (0.4 / 0.65 / 0.85). */
function phaseFromScore(pct: number): number {
  if (pct >= 85) return 4
  if (pct >= 65) return 3
  if (pct >= 40) return 2
  return 1
}

function bandHeadline(args: ProgressCardEmailArgs, locale: 'en' | 'ar'): string {
  const c = COPY[locale]
  if (args.assessmentKind === 'grand-test') {
    return args.passed ? c.grandPassed : c.grandFailed
  }
  if (args.assessmentKind === 'daily-assignment') return c.daily
  return c.entry
}

export function buildProgressCardEmail(args: ProgressCardEmailArgs): ProgressCardEmailContent {
  const locale = args.locale
  const c = COPY[locale]
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  const lang = locale === 'ar' ? 'ar' : 'en'
  const firstName = args.recipientName.split(' ')[0] ?? args.recipientName
  const subject = buildSubject(args)
  const pct = Math.round(args.scorePct)
  const eyebrow = c.eyebrow[args.assessmentKind]
  const headline = bandHeadline(args, locale)

  const weakChips = args.weakTopics
    .slice(0, 5)
    .map((t) => weakChip(escapeHtml(t)))
    .join('')

  const redo = (args.redoLinks ?? []).slice(0, 3)
  const redoBlock = redo.length === 0 ? '' : redoSection(redo, c.redoLabel)

  const dashboardUrl = escapeHtml(args.dashboardUrl)
  const escName = escapeHtml(firstName)
  // Already-escaped name used directly inside footer copy (the copy
  // string isn't re-escaped). Plain name handed to the text body.
  const escFullName = escapeHtml(args.recipientName)
  const escScore = `${args.correctCount}/${args.totalQuestions} · ${pct}%`

  const accent = pickAccent(args)

  const html = `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${PALETTE.fg};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(headline)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PALETTE.bg};">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:${PALETTE.bgElev};border:1px solid ${PALETTE.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="32" height="32" align="center" valign="middle" style="background:${PALETTE.fg};color:${PALETTE.bg};border-radius:8px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:13px;font-weight:800;line-height:32px;">SA</td>
                  <td style="padding-${locale === 'ar' ? 'right' : 'left'}:12px;font-size:15px;font-weight:600;letter-spacing:-0.2px;color:${PALETTE.fg};">SuperAccountant</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 8px;">
              <p style="margin:0 0 16px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${accent};">${escapeHtml(eyebrow)}</p>
              <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;font-weight:600;letter-spacing:-0.5px;color:${PALETTE.fg};">${locale === 'ar' ? `أهلًا ${escName}،` : `Hi ${escName},`}</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${PALETTE.fgMuted};">${escapeHtml(headline)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PALETTE.bgOverlay};border:1px solid ${PALETTE.border};border-radius:12px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <p style="margin:0;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${PALETTE.fgSubtle};">${escapeHtml(c.scoreLabel)}</p>
                    <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:${PALETTE.fg};letter-spacing:-0.5px;">${escapeHtml(escScore)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${weakSection(weakChips, c.weakLabel, c.noWeak, args.weakTopics.length)}
          ${redoBlock}
          <tr>
            <td style="padding:8px 40px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:10px;background:${PALETTE.accent};">
                    <a href="${dashboardUrl}" target="_blank" style="display:inline-block;padding:14px 28px;background:${PALETTE.accent};color:${PALETTE.accentFg};text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;letter-spacing:-0.2px;">${escapeHtml(c.cta)} &nbsp;&rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 32px;background:${PALETTE.bgOverlay};border-top:1px solid ${PALETTE.border};">
              <p style="margin:0 0 6px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1px;color:${PALETTE.fgSubtle};">${c.footerSent(escFullName)}</p>
              <p style="margin:0 0 6px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1px;color:${PALETTE.fgSubtle};">${escapeHtml(c.contact)}</p>
              <p style="margin:8px 0 0;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1px;color:${PALETTE.fgSubtle};">${escapeHtml(c.rights)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    locale === 'ar' ? `أهلًا ${firstName}،` : `Hi ${firstName},`,
    '',
    headline,
    '',
    `${c.scoreLabel}: ${escScore}`,
    args.weakTopics.length === 0
      ? c.noWeak
      : `${c.weakLabel}: ${args.weakTopics.slice(0, 5).join(', ')}`,
    redo.length > 0 ? '' : '',
    ...(redo.length > 0
      ? [`${c.redoLabel}:`, ...redo.map((r) => `  - ${r.title} → ${r.url}`)]
      : []),
    '',
    `${c.cta}: ${args.dashboardUrl}`,
    '',
    '---',
    c.contact,
    c.rights,
  ]
    .filter((line) => line !== undefined)
    .join('\n')

  return { subject, html, text }
}

function pickAccent(args: ProgressCardEmailArgs): string {
  if (args.assessmentKind === 'grand-test') {
    return args.passed ? PALETTE.success : PALETTE.warn
  }
  if (args.scorePct >= 70) return PALETTE.success
  if (args.scorePct >= 40) return PALETTE.accent
  return PALETTE.warn
}

function weakChip(text: string): string {
  return `<span style="display:inline-block;margin:0 6px 8px 0;padding:6px 12px;background:${PALETTE.bgOverlay};border:1px solid ${PALETTE.border};border-radius:999px;font-size:12px;color:${PALETTE.fgMuted};">${text}</span>`
}

function weakSection(chips: string, label: string, empty: string, count: number): string {
  if (count === 0) {
    return `
      <tr>
        <td style="padding:0 40px 16px;">
          <p style="margin:0;font-size:13px;color:${PALETTE.fgMuted};">${escapeHtml(empty)}</p>
        </td>
      </tr>`
  }
  return `
    <tr>
      <td style="padding:0 40px 16px;">
        <p style="margin:0 0 12px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${PALETTE.fgSubtle};">${escapeHtml(label)}</p>
        <div>${chips}</div>
      </td>
    </tr>`
}

function redoSection(links: ProgressRedoLink[], label: string): string {
  const items = links
    .map(
      (l) =>
        `<li style="margin:0 0 8px;font-size:14px;line-height:1.5;color:${PALETTE.fg};"><a href="${escapeHtml(l.url)}" target="_blank" style="color:${PALETTE.accent};text-decoration:none;">${escapeHtml(l.title)} &rarr;</a></li>`,
    )
    .join('')
  return `
    <tr>
      <td style="padding:0 40px 24px;">
        <p style="margin:0 0 12px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${PALETTE.fgSubtle};">${escapeHtml(label)}</p>
        <ul style="margin:0;padding:0;list-style:none;">${items}</ul>
      </td>
    </tr>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
