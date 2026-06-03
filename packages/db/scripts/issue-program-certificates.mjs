// One-shot: generate Certificate-of-Completion PDFs for two SuperAccountant
// Program graduates and email both attached to ibrahimshaheer91@gmail.com.
//
// Uses the existing certificate pipeline:
//   apps/web/src/lib/certificates/generate.ts → renders A4 landscape
//   vector PDFs via @react-pdf/renderer, uploads to Supabase Storage,
//   persists CertificateRecord rows.
//
// Run with tsx so the .ts imports resolve:
//   pnpm --filter @sa/web exec tsx packages/db/scripts/issue-program-certificates.mjs
//
// Flags:
//   --template=<id>   Certificate design id. Defaults to `ornate-cream`
//                     (the warm cream + gold + navy program-completion
//                     design). Valid ids are the keys of TEMPLATE_REGISTRY
//                     in apps/web/src/lib/certificates/templates/index.ts.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient()

const ROOT = resolve(__d, '../../..')
const generate = (
  await import(
    pathToFileURL(resolve(ROOT, 'apps/web/src/lib/certificates/generate.ts')).href
  )
).generateBatch

const OWNER_EMAIL = 'ibrahimshaheer91@gmail.com'
const RECIPIENT_INBOX = 'ibrahimshaheer91@gmail.com'

// Resolve the design id from --template=<id>; default to ornate-cream,
// which is the program-completion design Ibrahim asked for.
const VALID_TEMPLATE_IDS = new Set([
  'classic-navy',
  'ornate-cream',
  'tech-cert-aws',
  'tech-cert-azure',
  'tech-cert-gcp',
])
const templateFlag = process.argv.find((a) => a.startsWith('--template='))
const TEMPLATE_ID = templateFlag ? templateFlag.split('=')[1] : 'ornate-cream'
if (!VALID_TEMPLATE_IDS.has(TEMPLATE_ID)) {
  console.error(
    `Unknown --template=${TEMPLATE_ID}. Valid ids: ${[...VALID_TEMPLATE_IDS].join(', ')}`,
  )
  process.exit(1)
}
console.log(`✓ template: ${TEMPLATE_ID}`)

const owner = await prisma.identityUser.findUnique({
  where: { email: OWNER_EMAIL },
  select: { id: true, name: true },
})
if (!owner) {
  console.error(`No IdentityUser with email ${OWNER_EMAIL}`)
  process.exit(1)
}
console.log(`✓ owner: ${owner.id} (${owner.name ?? '(no name)'})`)

const result = await generate({
  ownerUserId: owner.id,
  template: {
    templateId: TEMPLATE_ID,
    title: 'Certificate of Completion',
    bodyTemplate:
      'This is to certify that {{name}} has successfully completed the SuperAccountant Program — demonstrating mastery of Excel, Accounting, GST, and TDS.',
    issuerName: 'CA Muneer Ahmed',
    issuerRole: 'Founder, SuperAccountant',
    issueDate: new Date().toISOString().slice(0, 10),
    accentColor: '#1e5891',
  },
  recipients: [
    { name: 'Mohammed Abdu Khader', email: null },
    { name: 'Mohammed Rehan', email: null },
  ],
  appBaseUrl: 'https://app.superaccountant.in',
})

console.log(
  `✓ Batch ${result.batchId} — issued ${result.issued.length}, failed ${result.failures.length}`,
)
for (const c of result.issued) console.log(`  · ${c.recipientName}  →  ${c.pdfUrl}`)
for (const f of result.failures) console.log(`  ✗ ${f.recipientName}  →  ${f.error}`)
if (result.issued.length !== 2 || result.failures.length > 0) {
  console.error('Expected 2 successes; aborting email.')
  await prisma.$disconnect()
  process.exit(1)
}

// Fetch the two PDFs from Supabase Storage and base64-encode for Resend.
const attachments = []
for (const c of result.issued) {
  const res = await fetch(c.pdfUrl)
  if (!res.ok) throw new Error(`fetch failed for ${c.recipientName}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const safe = c.recipientName.replace(/[^A-Za-z0-9 ]/g, '').replace(/ +/g, '-')
  attachments.push({
    filename: `${safe}-SuperAccountant-Certificate.pdf`,
    content: buf.toString('base64'),
  })
  console.log(`  ✓ fetched ${attachments.at(-1).filename} (${Math.round(buf.length / 1024)} KB)`)
}

// Send a single email to ibrahimshaheer91 with both attachments.
const RESEND_KEY = process.env.RESEND_API_KEY
const FROM = process.env.EMAIL_FROM
if (!RESEND_KEY || !FROM) {
  console.error('RESEND_API_KEY or EMAIL_FROM missing from .env')
  await prisma.$disconnect()
  process.exit(1)
}

const today = new Date().toISOString().slice(0, 10)
const html = `<!doctype html>
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;line-height:1.6;">
  <p>Hi Ibrahim,</p>
  <p>Two SuperAccountant Program completion certificates attached — A4 landscape, vector PDF, Canva-printable.</p>
  <ul>
    ${result.issued
      .map(
        (c) =>
          `<li><strong>${c.recipientName}</strong> — <a href="${c.pdfUrl}" style="color:#1e5891;">view in browser</a></li>`,
      )
      .join('\n    ')}
  </ul>
  <p style="color:#475569;font-size:13px;">Verify URLs are embedded in the PDF footers; both records persisted under batch <code>${result.batchId.slice(0, 8)}</code>.</p>
</div>`
const text = [
  `Two SuperAccountant Program completion certificates attached (issued ${today}).`,
  '',
  ...result.issued.map((c) => `${c.recipientName} — ${c.pdfUrl}`),
  '',
  `Batch: ${result.batchId.slice(0, 8)}`,
].join('\n')

const emailRes = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${RESEND_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: FROM,
    to: RECIPIENT_INBOX,
    subject: `2 SuperAccountant Program certificates — ${today}`,
    html,
    text,
    attachments,
  }),
})
if (!emailRes.ok) {
  console.error('email send failed:', await emailRes.text())
  await prisma.$disconnect()
  process.exit(1)
}
const data = await emailRes.json()
console.log(`\n✓ Emailed both certificates to ${RECIPIENT_INBOX} — Resend id: ${data.id}`)

await prisma.$disconnect()
