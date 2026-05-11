// One-shot smoke test for the bulk e-certificate generator.
// Generates 2 PDFs end-to-end, uploads to Supabase, persists to DB,
// reads back, deletes everything. Confirms the entire path is healthy
// before the user trusts it with real recipients.
//
// Note: imports the runtime TSX modules via tsx (no compile step
// needed). If you don't have tsx available, run via:
//   pnpm --filter web exec tsx packages/db/scripts/test-certificate-batch.mjs
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

// Import the generate orchestrator via a file:// URL (Windows-safe).
const ROOT = resolve(__d, '../../..')
const generateUrl = pathToFileURL(resolve(ROOT, 'apps/web/src/lib/certificates/generate.ts')).href
const generate = (await import(generateUrl)).generateBatch

const ownerUserId = '00000000-0000-0000-0000-000000000000'
let batchId

try {
  const result = await generate({
    ownerUserId,
    template: {
      title: 'Certificate of Completion — SMOKE TEST',
      bodyTemplate:
        'For successfully completing the Superaccountant smoke-test path. Awarded to {{name}} for the purposes of pipeline verification only.',
      issuerName: 'Smoke Tester',
      issuerRole: 'Automated QA',
      issueDate: new Date().toISOString().slice(0, 10),
      accentColor: '#7c3aed',
    },
    recipients: [
      { name: 'Aisha Sharma', email: 'aisha@smoketest.local' },
      { name: 'Rahul Mehta', email: null },
    ],
    appBaseUrl: 'https://smoketest.local',
  })

  batchId = result.batchId
  console.log(
    `✓ Batch ${batchId.slice(0, 8)} — issued ${result.issued.length}, failed ${result.failures.length}`,
  )
  for (const c of result.issued) {
    console.log(`  · ${c.recipientName}  →  ${c.pdfUrl}`)
  }
  for (const f of result.failures) {
    console.log(`  ✗ ${f.recipientName}  →  ${f.error}`)
  }

  if (result.issued.length !== 2) throw new Error(`expected 2 issued, got ${result.issued.length}`)
  if (result.failures.length !== 0) throw new Error('one or more recipients failed')

  // Read back from DB to confirm persistence.
  const records = await prisma.$queryRaw`
    SELECT "id", "recipientName", "pdfUrl", "verifyHash"
    FROM "CertificateRecord"
    WHERE "batchId" = ${batchId}
  `
  if (records.length !== 2) throw new Error(`db has ${records.length} records, expected 2`)
  console.log(`✓ DB persisted ${records.length} records`)

  // HEAD the first PDF URL to confirm it's accessible.
  const head = await fetch(records[0].pdfUrl, { method: 'HEAD' })
  if (!head.ok) throw new Error(`PDF not reachable: HTTP ${head.status}`)
  const size = head.headers.get('content-length')
  console.log(`✓ First PDF is publicly readable (${size} bytes)`)
  console.log('\n✓ Smoke test passed — certificate pipeline is healthy.')
} catch (err) {
  console.error('✗ Smoke test FAILED:', err.message)
  process.exitCode = 1
} finally {
  // Clean up: cascade delete via batch.
  if (batchId) {
    await prisma.$executeRaw`DELETE FROM "CertificateBatch" WHERE "id" = ${batchId}`
    console.log(`✓ Deleted test batch ${batchId.slice(0, 8)}`)
  }
  await prisma.$disconnect()
}
