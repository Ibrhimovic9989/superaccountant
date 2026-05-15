// One-off: add email-tracking columns to CertificateRecord so we can
// see who's been sent their certificate, when, and Resend's message id
// (for tracing bounces / replies).
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
  ALTER TABLE "CertificateRecord"
  ADD COLUMN IF NOT EXISTS "emailedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "emailMessageId" TEXT,
  ADD COLUMN IF NOT EXISTS "emailError" TEXT
`)
console.log('✓ CertificateRecord email columns')

await p.$disconnect()
console.log('\nDone')
