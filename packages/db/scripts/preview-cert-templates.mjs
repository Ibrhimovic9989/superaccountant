// One-shot: generate a sample certificate for each of the 5 template
// designs and email all of them attached to info@superaccountant.in for
// visual review. Run with tsx so the .ts imports resolve:
//   pnpm --filter @sa/api exec tsx "C:\path\to\packages\db\scripts\preview-cert-templates.mjs"

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
const { generateBatch } = await import(
  pathToFileURL(resolve(ROOT, 'apps/web/src/lib/certificates/generate.ts')).href
)

const owner = await prisma.identityUser.findUnique({
  where: { email: 'ibrahimshaheer91@gmail.com' },
  select: { id: true },
})
if (!owner) throw new Error('no owner user')

const TEMPLATES = [
  { id: 'classic-navy', name: 'Classic Navy', sample: 'Aisha Sharma' },
  { id: 'ornate-cream', name: 'Ornate Cream', sample: 'Mohammed Rehan' },
  { id: 'tech-cert-aws', name: 'Tech Cert · AWS-style', sample: 'Rahul Mehta' },
  { id: 'tech-cert-azure', name: 'Tech Cert · Azure-style', sample: 'Sania Khan' },
  { id: 'tech-cert-gcp', name: 'Tech Cert · GCP-style', sample: 'Priya Patel' },
]

const previewBatches = []
for (const t of TEMPLATES) {
  console.log(`▸ rendering ${t.name}…`)
  const result = await generateBatch({
    ownerUserId: owner.id,
    template: {
      templateId: t.id,
      title: 'Certificate of Completion',
      bodyTemplate:
        'This is to certify that {{name}} has successfully completed the SuperAccountant Program — demonstrating mastery of Excel, Accounting, GST, and TDS.',
      issuerName: 'CA Muneer Ahmed',
      issuerRole: 'Founder, SuperAccountant',
      issueDate: new Date().toISOString().slice(0, 10),
      accentColor: '#1e5891',
    },
    recipients: [{ name: t.sample, email: null }],
    appBaseUrl: 'https://app.superaccountant.in',
  })
  if (result.issued.length !== 1) {
    console.error(`  ✗ ${t.id}:`, result.failures)
    continue
  }
  console.log(`  ✓ ${t.id} → ${result.issued[0].pdfUrl}`)
  previewBatches.push({ ...t, batchId: result.batchId, pdfUrl: result.issued[0].pdfUrl })
}

// Fetch the PDFs and email them all attached.
const attachments = []
for (const p of previewBatches) {
  const res = await fetch(p.pdfUrl)
  if (!res.ok) throw new Error(`fetch failed ${p.id}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  attachments.push({
    filename: `${p.id}__${p.sample.replace(/[^A-Za-z0-9]+/g, '-')}.pdf`,
    content: buf.toString('base64'),
  })
  console.log(`  ✓ fetched ${attachments.at(-1).filename} (${Math.round(buf.length / 1024)} KB)`)
}

const today = new Date().toISOString().slice(0, 10)
const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,sans-serif;color:#0f172a;line-height:1.6;">
  <p>Hi Ibrahim,</p>
  <p>One sample certificate per design from the new 5-template catalogue. Same content (CA Muneer Ahmed as signatory, mastery in Excel/Accounting/GST/TDS); only the visual treatment varies.</p>
  <ul>
    ${previewBatches
      .map(
        (p) =>
          `<li><strong>${p.name}</strong> · <code>${p.id}</code> — sample: ${p.sample} — <a href="${p.pdfUrl}" style="color:#1e5891;">view in browser</a></li>`,
      )
      .join('')}
  </ul>
  <p style="color:#475569;font-size:13px;">Default for the program-completion flow is <code>ornate-cream</code>. Override with <code>--template=&lt;id&gt;</code> on the issue script. Tell me which to keep / iterate.</p>
</div>`

const emailRes = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: process.env.EMAIL_FROM,
    to: 'info@superaccountant.in',
    subject: `Certificate templates preview — 5 designs — ${today}`,
    html,
    text: previewBatches.map((p) => `${p.id}: ${p.pdfUrl}`).join('\n'),
    attachments,
  }),
})
if (!emailRes.ok) {
  console.error('email failed:', await emailRes.text())
  process.exit(1)
}
const data = await emailRes.json()
console.log(`\n✓ Emailed ${previewBatches.length} sample certificates to info@superaccountant.in — Resend id: ${data.id}`)

// Clean up: cascade delete the 5 preview batches so they don't pollute the
// CertificateRecord table. PDFs in Supabase Storage remain (harmless, gated
// behind unguessable URLs).
for (const p of previewBatches) {
  await prisma.$executeRaw`DELETE FROM "CertificateBatch" WHERE "id" = ${p.batchId}`
}
console.log(`✓ Cleaned up ${previewBatches.length} preview batches from DB`)

await prisma.$disconnect()
