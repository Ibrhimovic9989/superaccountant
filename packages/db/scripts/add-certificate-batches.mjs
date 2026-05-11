// One-shot: create the CertificateBatch + CertificateRecord tables for
// the bulk e-certificate generator.
//
// A "batch" is one form submission — same template config applied to N
// recipients. Each recipient becomes one CertificateRecord with its own
// PDF URL (in Supabase Storage) and a hash-signed verification token.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
const { PrismaClient } = await import('@prisma/client')
const p = new PrismaClient()

await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "CertificateBatch" (
    "id" TEXT PRIMARY KEY,
    "ownerUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "issuerName" TEXT NOT NULL,
    "issuerRole" TEXT,
    "issueDate" DATE NOT NULL,
    "accentColor" TEXT,
    "logoUrl" TEXT,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
  )
`)
console.log('✓ CertificateBatch table')

await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "CertificateRecord" (
    "id" TEXT PRIMARY KEY,
    "batchId" TEXT NOT NULL REFERENCES "CertificateBatch"("id") ON DELETE CASCADE,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "pdfUrl" TEXT NOT NULL,
    "verifyHash" TEXT NOT NULL UNIQUE,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
  )
`)
console.log('✓ CertificateRecord table')

await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "CertificateBatch_owner_createdAt_idx"
  ON "CertificateBatch" ("ownerUserId", "createdAt" DESC)
`)
await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "CertificateRecord_batch_idx"
  ON "CertificateRecord" ("batchId")
`)
console.log('✓ indexes')

await p.$disconnect()
console.log('\nCertificate tables ready')
