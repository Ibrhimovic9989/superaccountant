#!/usr/bin/env node
/**
 * Sends the GST & TDS Masterclass reminder email (event: 25 May 2026) to
 * every unique registrant in the Google Form responses CSV. Inline poster
 * via cid attachment + reply-to info@superaccountant.in for replies.
 *
 * Usage:
 *   node scripts/send-masterclass-reminder.mjs --dry-run
 *       List who would be emailed. No mail sent.
 *   node scripts/send-masterclass-reminder.mjs --to=you@example.com
 *       Send to a single address (must be in the CSV — use for self-test).
 *   node scripts/send-masterclass-reminder.mjs
 *       Send to ALL unique registrants. Asks for explicit y/N confirm.
 *
 * Flags:
 *   --csv=<path>     CSV path (default: project-root form responses file)
 *   --poster=<path>  JPEG/PNG poster path (default: ./pngposter.jpeg)
 *   --yes            Skip the y/N confirmation prompt (use with care)
 *
 * Rate-limited to ~1.6 emails/sec (Resend's default cap is 2/sec).
 */

import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'

const __d = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__d, '..')

// ── env loader (same pattern as scripts/generate-song-audio-suno.mjs) ──
for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

// ── args ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const isDryRun = argv.includes('--dry-run')
const skipConfirm = argv.includes('--yes')
const onlyTo = argv.find((a) => a.startsWith('--to='))?.slice(5)?.trim().toLowerCase()
const nameOverride = argv.find((a) => a.startsWith('--name='))?.slice(7)?.trim()
const csvPath = resolve(
  ROOT,
  argv.find((a) => a.startsWith('--csv='))?.slice(6) ??
    'mainmain - Copy of Registration (Responses) - Form Responses 1.csv',
)
const posterPath = resolve(ROOT, argv.find((a) => a.startsWith('--poster='))?.slice(9) ?? 'pngposter.jpeg')

// ── constants ───────────────────────────────────────────────────────────
const REGISTER_URL = 'https://forms.gle/dpio4miU36QAbT6A9'
const REPLY_TO = 'info@superaccountant.in'
const POSTER_CID = 'masterclass-poster@superaccountant.in'
const SEND_INTERVAL_MS = 600 // ~1.66/sec, under Resend's 2/sec cap

const RESEND_KEY = process.env.RESEND_API_KEY
const FROM = process.env.EMAIL_FROM
if (!RESEND_KEY) die('RESEND_API_KEY missing from .env')
if (!FROM) die('EMAIL_FROM missing from .env')
if (!existsSync(csvPath)) die(`CSV not found: ${csvPath}`)
if (!existsSync(posterPath)) die(`Poster not found: ${posterPath}`)

// ── CSV parser (handles quoted fields with embedded commas/newlines) ────
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') {
        row.push(field)
        field = ''
      } else if (c === '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      } else if (c === '\r') {
        /* ignore */
      } else field += c
    }
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

const csvText = readFileSync(csvPath, 'utf8')
const rows = parseCsv(csvText)
const header = rows[0]
const emailCol = header.findIndex((h) => /email/i.test(h))
const nameCol = header.findIndex((h) => /your name|^\s*name/i.test(h))
if (emailCol < 0) die('No email column found in CSV header')

// Dedup on (email + normalized name) only — same email used by different
// people (e.g. siblings sharing an inbox) gets a separate email per name.
// Truly-duplicate rows (same email AND same name) collapse to one.
const seen = new Set()
const recipients = []
for (const r of rows.slice(1)) {
  const email = (r[emailCol] ?? '').trim().toLowerCase()
  const name = nameCol >= 0 ? (r[nameCol] ?? '').trim() : ''
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) continue
  const key = `${email}|${name.toLowerCase().replace(/\s+/g, ' ')}`
  if (seen.has(key)) continue
  seen.add(key)
  recipients.push({ email, name: name || 'there' })
}

// If --to=<email> is given, send only to that address. If it's in the CSV
// use that row's name (so the email reads naturally for self-tests); if not,
// fall back to --name=<name> or "there".
let targets
if (onlyTo) {
  const fromCsv = recipients.find((r) => r.email === onlyTo)
  if (fromCsv) {
    targets = [nameOverride ? { ...fromCsv, name: nameOverride } : fromCsv]
  } else {
    targets = [{ email: onlyTo, name: nameOverride || 'there' }]
  }
} else {
  targets = recipients
}

const posterBytes = readFileSync(posterPath)
const posterBase64 = posterBytes.toString('base64')

console.log('───────────────────────────────────────────────────')
console.log(`CSV:        ${csvPath}`)
console.log(`Poster:     ${posterPath} (${(posterBytes.length / 1024).toFixed(1)} KB)`)
console.log(`From:       ${FROM}`)
console.log(`Reply-to:   ${REPLY_TO}`)
console.log(`Register:   ${REGISTER_URL}`)
console.log(`Unique:     ${recipients.length} recipients`)
console.log(`Sending to: ${targets.length}${onlyTo ? ` (filtered to ${onlyTo})` : ''}`)
console.log(`Dry run:    ${isDryRun ? 'YES — no mail will be sent' : 'NO — real send'}`)
console.log('───────────────────────────────────────────────────')

if (isDryRun) {
  for (const r of targets) console.log(`  · ${r.email.padEnd(40)} ${r.name}`)
  console.log(`\n(dry run) Would have sent ${targets.length} email(s).`)
  process.exit(0)
}

if (!skipConfirm && !onlyTo) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(
    `\nAbout to send ${targets.length} REAL emails. Type "send" to proceed: `,
  )
  rl.close()
  if (answer.trim().toLowerCase() !== 'send') {
    console.log('Aborted.')
    process.exit(1)
  }
}

// ── HTML template (kept here, not imported, so script is self-contained) ─
function buildEmail({ recipientName, recipientEmail, registerUrl, posterCid }) {
  const firstName = (recipientName.split(' ')[0] ?? recipientName).trim() || 'there'
  const subject = `Tomorrow, 10 AM — GST & TDS Masterclass (${firstName}, your seat is held)`
  const escName = escapeHtml(firstName)
  const escEmail = escapeHtml(recipientEmail)
  const escUrl = escapeHtml(registerUrl)
  const escCid = escapeHtml(posterCid)
  const P = {
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
  const html = `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:${P.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${P.fg};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Tomorrow at 10 AM. 4th Floor, Downtown Mall, Lakdikapul. Bring your laptop.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${P.bg};">
    <tr><td align="center" style="padding:48px 24px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:${P.bgElev};border:1px solid ${P.border};border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 40px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="32" height="32" align="center" valign="middle" style="background:${P.fg};color:${P.bg};border-radius:8px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:13px;font-weight:800;line-height:32px;">SA</td>
            <td style="padding-left:12px;font-size:15px;font-weight:600;letter-spacing:-0.2px;color:${P.fg};">SuperAccountant</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:36px 40px 8px;">
          <p style="margin:0 0 16px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${P.accent};">REMINDER &middot; MASTERCLASS TOMORROW</p>
          <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;font-weight:600;letter-spacing:-0.5px;color:${P.fg};">${escName}, tomorrow at 10 AM.</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${P.fgMuted};">Quick reminder &mdash; you're registered for the free <strong style="color:${P.fg};font-weight:600;">GST &amp; TDS Masterclass</strong>. Three hours, live, no jargon. Your seat is held.</p>
        </td></tr>
        <tr><td style="padding:0 40px 24px;">
          <img src="cid:${escCid}" alt="GST &amp; TDS Masterclass &mdash; 25 May 2026" width="480" style="display:block;width:100%;max-width:480px;height:auto;border-radius:12px;border:1px solid ${P.border};" />
        </td></tr>
        <tr><td style="padding:0 40px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${P.bgOverlay};border:1px solid ${P.border};border-radius:12px;"><tr><td style="padding:18px 22px;">
            <p style="margin:0 0 4px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${P.fgSubtle};">DATE</p>
            <p style="margin:0 0 14px;font-size:14px;color:${P.fg};">Monday, 25 May 2026</p>
            <p style="margin:0 0 4px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${P.fgSubtle};">TIME</p>
            <p style="margin:0 0 14px;font-size:14px;color:${P.fg};">10:00 AM &ndash; 1:00 PM</p>
            <p style="margin:0 0 4px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${P.fgSubtle};">VENUE</p>
            <p style="margin:0 0 14px;font-size:14px;color:${P.fg};">4th Floor, Downtown Mall, Lakdikapul, Hyderabad</p>
            <p style="margin:0 0 4px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${P.fgSubtle};">BRING</p>
            <p style="margin:0;font-size:14px;color:${P.fg};">Your laptop. That's it.</p>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:0 40px 8px;">
          <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:${P.fgMuted};">By the end of the session you'll know how GST returns actually work, the TDS sections that matter, and you'll see a live demo of the AI agent we're building for accountants.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" style="border-radius:10px;background:${P.accent};">
              <a href="${escUrl}" target="_blank" style="display:inline-block;padding:14px 28px;background:${P.accent};color:${P.accentFg};text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;letter-spacing:-0.2px;">Confirm my seat &nbsp;&rarr;</a>
            </td>
          </tr></table>
          <p style="margin:14px 0 0;font-size:13px;color:${P.fgSubtle};">Can't make it? Just reply to this email and we'll free your seat for someone on the waitlist.</p>
        </td></tr>
        <tr><td style="padding:24px 40px 32px;">
          <div style="background:${P.bgOverlay};border:1px solid ${P.border};border-radius:10px;padding:16px 18px;">
            <p style="margin:0 0 8px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${P.fgSubtle};">Need help finding the venue?</p>
            <p style="margin:0;font-size:13px;color:${P.fgMuted};">Call or WhatsApp <a href="tel:+918106138866" style="color:${P.accent};text-decoration:none;">+91 81061 38866</a>. We're on the 4th floor of Downtown Mall, opposite Lakdikapul metro station.</p>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px 32px;background:${P.bgOverlay};border-top:1px solid ${P.border};">
          <p style="margin:0 0 6px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1px;color:${P.fgSubtle};">Sent to ${escEmail}. You registered via forms.gle for the GST &amp; TDS Masterclass.</p>
          <p style="margin:0 0 6px;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1px;color:${P.fgSubtle};">Questions? Reply to this email or write to info@superaccountant.in</p>
          <p style="margin:8px 0 0;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;letter-spacing:1px;color:${P.fgSubtle};">SuperAccountant Technologies &middot; Unit 422, Downtown Mall, Lakdikapul, Hyderabad &middot; &copy; 2026</p>
        </td></tr>
      </table>
    </td></tr>
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
    `Confirm your seat: ${registerUrl}`,
    '',
    "Can't make it? Just reply to this email and we'll free your seat for someone on the waitlist.",
    '',
    'Need help finding the venue? Call or WhatsApp +91 81061 38866.',
    '',
    '---',
    `Sent to ${recipientEmail}.`,
    'Questions? Reply here or write to info@superaccountant.in',
    'SuperAccountant Technologies · Unit 422, Downtown Mall, Lakdikapul, Hyderabad · © 2026',
  ].join('\n')
  return { subject, html, text }
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── send loop ───────────────────────────────────────────────────────────
const sent = []
const failed = []
let i = 0
for (const r of targets) {
  i++
  const { subject, html, text } = buildEmail({
    recipientName: r.name,
    recipientEmail: r.email,
    registerUrl: REGISTER_URL,
    posterCid: POSTER_CID,
  })
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: r.email,
        subject,
        html,
        text,
        reply_to: REPLY_TO,
        attachments: [
          {
            filename: 'masterclass-poster.jpeg',
            content: posterBase64,
            content_id: POSTER_CID,
          },
        ],
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`HTTP ${res.status}: ${body}`)
    }
    const data = await res.json()
    sent.push({ email: r.email, id: data.id })
    console.log(`  [${i}/${targets.length}] ✓ ${r.email.padEnd(40)} id=${data.id}`)
  } catch (e) {
    failed.push({ email: r.email, error: e.message })
    console.log(`  [${i}/${targets.length}] ✗ ${r.email.padEnd(40)} ${e.message}`)
  }
  if (i < targets.length) await new Promise((r) => setTimeout(r, SEND_INTERVAL_MS))
}

console.log('\n───────────────────────────────────────────────────')
console.log(`Sent:   ${sent.length}`)
console.log(`Failed: ${failed.length}`)
if (failed.length) {
  console.log('\nFailures:')
  for (const f of failed) console.log(`  · ${f.email}  —  ${f.error}`)
}
console.log('───────────────────────────────────────────────────')

function die(msg) {
  console.error(`[send-masterclass-reminder] ERROR: ${msg}`)
  process.exit(1)
}
