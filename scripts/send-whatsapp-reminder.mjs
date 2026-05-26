#!/usr/bin/env node
/**
 * WhatsApp reminder blast via Playwright attached to a running Chrome where
 * WhatsApp Web is already logged in. Use the wa.me URL trick to pre-fill the
 * chat then press Enter to send — works for any phone number (no need to
 * have the contact saved).
 *
 * Prerequisites:
 *   1. Close all Chrome windows.
 *   2. Relaunch Chrome with the DevTools port open:
 *        & "C:\Program Files\Google\Chrome\Application\chrome.exe" `
 *            --remote-debugging-port=9222 `
 *            --user-data-dir="$env:LOCALAPPDATA\Google\Chrome\User Data"
 *      Chrome's session-restore will bring back your WhatsApp Web tab.
 *   3. Confirm WhatsApp Web shows the chat list (i.e. logged in).
 *
 * Usage:
 *   node scripts/send-whatsapp-reminder.mjs --dry-run
 *       Print recipients + normalized phones, send nothing.
 *   node scripts/send-whatsapp-reminder.mjs --to=919010588450
 *       Send to one phone (digits only, with country code).
 *   node scripts/send-whatsapp-reminder.mjs
 *       Blast to all unique recipients. Interactive confirm at start.
 *
 * Flags:
 *   --cdp=<url>      CDP endpoint (default http://localhost:9222)
 *   --min-delay=<s>  Min seconds between sends (default 8)
 *   --max-delay=<s>  Max seconds between sends (default 20)
 *   --yes            Skip the y/N confirmation
 */

import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'
import { chromium } from '@playwright/test'

const __d = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__d, '..')

const argv = process.argv.slice(2)
const isDryRun = argv.includes('--dry-run')
const skipConfirm = argv.includes('--yes')
const onlyTo = argv.find((a) => a.startsWith('--to='))?.slice(5)?.trim()
const cdpUrl = argv.find((a) => a.startsWith('--cdp='))?.slice(6) ?? 'http://localhost:9222'
const minDelaySec = Number(argv.find((a) => a.startsWith('--min-delay='))?.slice(12) ?? '8')
const maxDelaySec = Number(argv.find((a) => a.startsWith('--max-delay='))?.slice(12) ?? '20')
const csvPath = resolve(
  ROOT,
  argv.find((a) => a.startsWith('--csv='))?.slice(6) ??
    'mainmain - Copy of Registration (Responses) - Form Responses 1.csv',
)

if (!existsSync(csvPath)) die(`CSV not found: ${csvPath}`)

// ── CSV parser (handles quoted multi-line fields) ───────────────────────
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

// Normalize Indian phone numbers to 12-digit 91XXXXXXXXXX form.
function normalizePhone(s) {
  const digits = (s ?? '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
  return null
}

const rows = parseCsv(readFileSync(csvPath, 'utf8'))
const header = rows[0]
const emailCol = header.findIndex((h) => /email/i.test(h))
const nameCol = header.findIndex((h) => /your name|^\s*name/i.test(h))
const phoneCol = header.findIndex((h) => /mobile|phone/i.test(h))
if (phoneCol < 0) die('No phone column found in CSV header')

// Dedup by (phone + normalized name) — same person registering twice from
// the same number collapses; different people sharing a number get one each.
const seen = new Set()
const recipients = []
const rejected = []
for (const r of rows.slice(1)) {
  const rawPhone = r[phoneCol] ?? ''
  const phone = normalizePhone(rawPhone)
  const name = nameCol >= 0 ? (r[nameCol] ?? '').trim() : ''
  const email = emailCol >= 0 ? (r[emailCol] ?? '').trim() : ''
  if (!phone) {
    if (rawPhone.trim()) rejected.push({ rawPhone, name, reason: 'unrecognized format' })
    continue
  }
  const key = `${phone}|${name.toLowerCase().replace(/\s+/g, ' ')}`
  if (seen.has(key)) continue
  seen.add(key)
  recipients.push({ phone, name: name || 'there', email })
}

let targets
if (onlyTo) {
  const wanted = normalizePhone(onlyTo) ?? onlyTo.replace(/\D/g, '')
  targets = recipients.filter((r) => r.phone === wanted)
  if (!targets.length) targets = [{ phone: wanted, name: 'there', email: '' }]
} else {
  targets = recipients
}

console.log('───────────────────────────────────────────────────')
console.log(`CSV:        ${csvPath}`)
console.log(`CDP:        ${cdpUrl}`)
console.log(`Unique:     ${recipients.length} recipients`)
console.log(`Sending to: ${targets.length}${onlyTo ? ` (filtered to ${onlyTo})` : ''}`)
console.log(`Delay:      ${minDelaySec}–${maxDelaySec}s random between sends`)
console.log(`Dry run:    ${isDryRun ? 'YES — no messages will be sent' : 'NO — real send'}`)
if (rejected.length) {
  console.log(`Rejected:   ${rejected.length} unrecognized phone(s):`)
  for (const x of rejected) console.log(`  · ${JSON.stringify(x.rawPhone)} (${x.name})`)
}
console.log('───────────────────────────────────────────────────')

if (isDryRun) {
  for (const r of targets) console.log(`  · +${r.phone.padEnd(13)} ${r.name}`)
  const estMin = Math.round(((minDelaySec + maxDelaySec) / 2) * targets.length / 60)
  console.log(`\n(dry run) Would have sent ${targets.length} message(s). ~${estMin} min estimated.`)
  process.exit(0)
}

if (!skipConfirm && !onlyTo) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  console.log('\n⚠️  WhatsApp can flag bulk senders. Risk of temporary number ban.')
  const answer = await rl.question(`Type "send" to blast ${targets.length} WhatsApp messages: `)
  rl.close()
  if (answer.trim().toLowerCase() !== 'send') {
    console.log('Aborted.')
    process.exit(1)
  }
}

// ── Connect to running Chrome ───────────────────────────────────────────
let browser
try {
  browser = await chromium.connectOverCDP(cdpUrl)
} catch (e) {
  die(
    `Could not connect to Chrome at ${cdpUrl}.\n` +
      `   Make sure Chrome is running with --remote-debugging-port=9222.\n` +
      `   Original error: ${e.message}`,
  )
}

// connectOverCDP gives us the default browser context (the user's profile).
const contexts = browser.contexts()
if (!contexts.length) die('Chrome has no browser contexts — is it actually running?')
const ctx = contexts[0]

// Find an existing WhatsApp Web tab, or open one.
let page = ctx.pages().find((p) => /whatsapp\.com/.test(p.url()))
if (!page) {
  console.log('No WhatsApp Web tab found — opening one.')
  page = await ctx.newPage()
  await page.goto('https://web.whatsapp.com', { waitUntil: 'load' })
}
await page.bringToFront()

// Sanity-check: are we logged in? Look for the chat list or search bar.
console.log('Verifying WhatsApp Web is logged in…')
try {
  await page.waitForSelector(
    'div[aria-label="Chat list"], div[aria-label="Search input textbox"], header[data-testid="chatlist-header"]',
    { timeout: 30_000 },
  )
} catch {
  die(
    'WhatsApp Web does not appear to be logged in. Scan the QR code in the browser, then re-run.',
  )
}
console.log('✓ WhatsApp Web ready. Starting sends.\n')

// Title-case a name fragment so "GHOUSE" → "Ghouse" and "zineerah" → "Zineerah".
function titleCase(s) {
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((tok) => (tok && /^[a-z]/.test(tok) ? tok[0].toUpperCase() + tok.slice(1) : tok))
    .join('')
}

// ── Message template ────────────────────────────────────────────────────
function buildMessage(firstName) {
  const name = titleCase(firstName)
  return [
    `Hi ${name},`,
    '',
    "This is a quick reminder about today's GST & TDS Masterclass — your seat is confirmed.",
    '',
    '🗓 Today, Monday 25 May',
    '🕙 10:00 AM – 1:00 PM',
    '📍 4th Floor, Downtown Mall, Lakdikapul, Hyderabad',
    '💻 Please carry your laptop',
    '',
    'Doors open at 9:45 AM — please try to arrive a few minutes early so we can begin on time.',
    '',
    "If you're unable to make it, kindly reply here so we can offer your seat to someone on the waitlist.",
    '',
    'Looking forward to seeing you there.',
    '',
    'Best regards,',
    'Ibrahim',
    'SuperAccountant',
    '+91 81061 38866',
  ].join('\n')
}

// ── Send loop ───────────────────────────────────────────────────────────
const sent = []
const failed = []
let i = 0
for (const r of targets) {
  i++
  const firstName = (r.name.split(' ')[0] ?? r.name).trim() || 'there'
  const message = buildMessage(firstName)
  const url = `https://web.whatsapp.com/send?phone=${r.phone}&text=${encodeURIComponent(message)}&app_absent=0`

  try {
    await page.goto(url, { waitUntil: 'load', timeout: 45_000 })

    // Wait for the chat input to appear. WhatsApp shows a "Starting chat"
    // loading dialog briefly that auto-dismisses — don't treat that as an
    // error. Only check for real error dialogs if the textbox never appears.
    try {
      await page.waitForSelector(
        'footer div[contenteditable="true"][role="textbox"], footer div[contenteditable="true"][data-lexical-editor="true"]',
        { timeout: 45_000 },
      )
    } catch {
      const dialogVisible = await page
        .locator('div[role="dialog"]')
        .first()
        .isVisible()
        .catch(() => false)
      if (dialogVisible) {
        const dialogText = await page
          .locator('div[role="dialog"]')
          .first()
          .innerText()
          .catch(() => '(no text)')
        try {
          await page.locator('div[role="dialog"] button').first().click({ timeout: 3000 })
        } catch {}
        throw new Error(`dialog: ${dialogText.slice(0, 80).replace(/\n/g, ' ')}`)
      }
      throw new Error('timed out waiting for chat to load')
    }

    // Chat loaded with text pre-filled. Focus the input and press Enter.
    await page
      .locator('footer div[contenteditable="true"][role="textbox"]')
      .first()
      .focus()
    await page.keyboard.press('Enter')

    // Wait for the message to actually post — the input clears after send.
    await page.waitForTimeout(2500)

    sent.push(r)
    console.log(`  [${i}/${targets.length}] ✓ +${r.phone}  ${r.name}`)
  } catch (e) {
    failed.push({ ...r, error: e.message })
    console.log(`  [${i}/${targets.length}] ✗ +${r.phone}  ${r.name}  —  ${e.message}`)
  }

  if (i < targets.length) {
    const delaySec = minDelaySec + Math.random() * (maxDelaySec - minDelaySec)
    await page.waitForTimeout(delaySec * 1000)
  }
}

console.log('\n───────────────────────────────────────────────────')
console.log(`Sent:   ${sent.length}`)
console.log(`Failed: ${failed.length}`)
if (failed.length) {
  console.log('\nFailures:')
  for (const f of failed) console.log(`  · +${f.phone} (${f.name})  —  ${f.error}`)
}
console.log('───────────────────────────────────────────────────')

// Safe: when attached via connectOverCDP, browser.close() only detaches
// the Playwright session — your Chrome stays open.
await browser.close()

function die(msg) {
  console.error(`[send-whatsapp-reminder] ERROR: ${msg}`)
  process.exit(1)
}
