#!/usr/bin/env node
/**
 * Plain-text-style follow-up to the branded masterclass reminder.
 * Designed to land in Gmail's Primary tab (not Promotions):
 *   - From: "Ibrahim from SuperAccountant" (personal name, not brand)
 *   - Subject: lowercase, transactional, no marketing words
 *   - Body: minimal HTML matching Gmail's default-compose look
 *   - No inline images, no CTA buttons, no marketing footer
 *   - Plain-text alternative is the canonical version
 *
 * Same CSV + dedup logic as send-masterclass-reminder.mjs. Same --to /
 * --dry-run / --yes flags.
 */

import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'

const __d = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__d, '..')

for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

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

const RESEND_KEY = process.env.RESEND_API_KEY
// Personal sender — overrides EMAIL_FROM for this follow-up specifically.
const FROM = 'Ibrahim from SuperAccountant <hello@superaccountant.in>'
const REPLY_TO = 'info@superaccountant.in'
const SEND_INTERVAL_MS = 600

if (!RESEND_KEY) die('RESEND_API_KEY missing from .env')
if (!existsSync(csvPath)) die(`CSV not found: ${csvPath}`)

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

console.log('───────────────────────────────────────────────────')
console.log(`CSV:        ${csvPath}`)
console.log(`From:       ${FROM}`)
console.log(`Reply-to:   ${REPLY_TO}`)
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

function buildEmail({ recipientName }) {
  const firstName = (recipientName.split(' ')[0] ?? recipientName).trim() || 'there'
  // Lowercase, conversational, no marketing words.
  const subject = `today at 10am — masterclass at downtown mall`

  // Plain text — what Gmail will show clients that don't render HTML.
  const text = [
    `hey ${firstName},`,
    '',
    "quick one — today's the masterclass.",
    '',
    'monday, 25 may',
    '10:00 am',
    '4th floor, downtown mall, lakdikapul',
    'bring your laptop',
    '',
    "if you can't make it, just reply to this email and we'll free your seat for someone on the waitlist.",
    '',
    'see you in a few hours.',
    '',
    '— ibrahim',
    'superaccountant',
    '+91 81061 38866',
  ].join('\n')

  // Minimal HTML — matches what Gmail compose generates by default.
  // No background colors, no inline-styled tables, no images, no buttons.
  // Just paragraphs. This is the format Gmail trusts as "person mail".
  const html = `<div dir="ltr">
<p>hey ${escapeHtml(firstName)},</p>
<p>quick one — today's the masterclass.</p>
<p>
monday, 25 may<br>
10:00 am<br>
4th floor, downtown mall, lakdikapul<br>
bring your laptop
</p>
<p>if you can't make it, just reply to this email and we'll free your seat for someone on the waitlist.</p>
<p>see you in a few hours.</p>
<p>— ibrahim<br>
superaccountant<br>
+91 81061 38866</p>
</div>`

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

const sent = []
const failed = []
let i = 0
for (const r of targets) {
  i++
  const { subject, html, text } = buildEmail({ recipientName: r.name })
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
  console.error(`[send-masterclass-plain] ERROR: ${msg}`)
  process.exit(1)
}
