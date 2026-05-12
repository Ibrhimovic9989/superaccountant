// One-shot: add `role` column to IdentityUser to support staff/admin
// override of the cohort-gate (so founders + ops can use every feature
// without enrolling in a paid cohort), and grant the founder admin.
//
// Roles:
//   'student' (default) — gets cohort-gated experience
//   'staff'             — full access to all features
//   'admin'             — full access + admin pages (e.g. /certificates/new
//                          batch generation, future /admin/applications)
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

// `role` may already exist as `text` on some envs (older migration).
// ADD COLUMN IF NOT EXISTS is idempotent; if a column exists with a
// different default we leave it as-is and just ensure NOT NULL.
await p.$executeRawUnsafe(`
  ALTER TABLE "IdentityUser"
  ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'student'
`)
console.log('✓ role column on IdentityUser (default: student)')

// Grant the founder admin so /certificates/new etc. still work without
// having to pay for our own cohort.
const FOUNDER_EMAIL = 'finacraco@gmail.com'
const result = await p.$executeRaw`
  UPDATE "IdentityUser"
  SET "role" = 'admin', "updatedAt" = NOW()
  WHERE LOWER("email") = ${FOUNDER_EMAIL.toLowerCase()}
`
console.log(`✓ Granted admin to ${FOUNDER_EMAIL} (${result} row affected)`)

await p.$disconnect()
console.log('\nRole column ready')
