// One-off: add consent-tracking columns to IdentityUser so we have an
// auditable record of which user agreed to which version of the T&C
// and refund policy. Required for Razorpay KYC + any future dispute.
//
// `consentedAt` is NULL until the user ticks the consent form.
// `consentedTermsVersion` is the dated marker we ship with /terms — bump
// it whenever the T&C materially changes, which forces existing users
// to re-consent on next visit (handled by the redirect gate).
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
  ALTER TABLE "IdentityUser"
  ADD COLUMN IF NOT EXISTS "consentedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "consentedTermsVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "consentedIp" TEXT,
  ADD COLUMN IF NOT EXISTS "consentedUserAgent" TEXT
`)
console.log('✓ IdentityUser consent columns')

// Audit who has consented vs not.
const counts = await p.$queryRaw`
  SELECT
    COUNT(*) FILTER (WHERE "consentedAt" IS NOT NULL)::int AS consented,
    COUNT(*) FILTER (WHERE "consentedAt" IS NULL)::int AS pending,
    COUNT(*)::int AS total
  FROM "IdentityUser"
`
console.log('IdentityUser consent state:', counts[0])

await p.$disconnect()
console.log('\nDone')
