// One-shot: seed `MUNEER100` — 100% off, works on BOTH cohorts
// (India iA26 + KSA sA26). Founder-pick hand-out, NOT public.
//
// Why a second 100% code when supertest100 already exists?
//   - 'supertest100' reads test-y in DMs.
//   - 'MUNEER100' is the public-facing-but-private code the founder
//     can drop into a WhatsApp without 'why does it say test'.
//   - We keep supertest100 active for backward compat (4 redemptions
//     on the books — don't break the audit trail).
//
// Mechanics:
//   discountPercent = 100         100% off the base price
//   cohortId        = NULL        applies to any cohort — validation
//                                 only fails wrong_cohort when a
//                                 non-null cohortId mismatches.
//   maxUses         = NULL        unlimited (founder gates usage by
//                                 only sharing it with hand-picks).
//   active          = TRUE
//
// Idempotent: re-runs upsert the same row.

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

await p.$executeRaw`
  INSERT INTO "DiscountCode" (
    "id", "code", "discountPercent", "maxUses", "cohortId", "active", "notes"
  ) VALUES (
    ${'disc-muneer100'},
    ${'MUNEER100'},
    ${100},
    ${null},
    ${null},
    ${true},
    ${'Founder hand-out — 100% off either cohort. Hand-pick only.'}
  )
  ON CONFLICT ("code") DO UPDATE SET
    "discountPercent" = EXCLUDED."discountPercent",
    "cohortId"        = EXCLUDED."cohortId",
    "active"          = EXCLUDED."active",
    "notes"           = EXCLUDED."notes",
    "updatedAt"       = NOW()
`
console.log('✓ MUNEER100 seeded — 100% off, both cohorts, unlimited uses')

const rows = await p.$queryRaw`
  SELECT "code", "discountPercent" AS pct, "cohortId" AS cohort_id,
         "maxUses" AS max_uses, "usedCount" AS used, "active"
  FROM "DiscountCode"
  WHERE LOWER("code") = 'muneer100'
  LIMIT 1
`
console.log(JSON.stringify(rows[0], null, 2))

await p.$disconnect()
