// One-off: add `finalAmountMinor` column to DiscountCode for codes that
// don't fit the percent model — they set a specific final price.
//
// Then seed `onerupee`: ₹1 final price, scoped to the Indian Chartered
// cohort (iA26). Private founder-pick code, hand-out only.
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

// (a) Add the column (nullable so existing percent-based codes are unaffected).
await p.$executeRawUnsafe(`
  ALTER TABLE "DiscountCode"
  ADD COLUMN IF NOT EXISTS "finalAmountMinor" INTEGER
`)
console.log('✓ DiscountCode.finalAmountMinor column')

// (b) Seed onerupee — ₹1 final price, scoped to Indian cohort iA26.
const exists = await p.$queryRaw`
  SELECT "id" FROM "DiscountCode" WHERE LOWER("code") = 'onerupee' LIMIT 1
`
if (exists.length === 0) {
  await p.$executeRaw`
    INSERT INTO "DiscountCode" (
      "id", "code", "discountPercent", "finalAmountMinor",
      "maxUses", "cohortId", "active", "notes"
    ) VALUES (
      ${'disc-onerupee'},
      ${'onerupee'},
      ${99},
      ${100},
      ${null},
      ${'cohort-mumbai-jun-2026'},
      ${true},
      ${'Private founder-pick code — pay ₹1 for iA26 (Indian cohort) only.'}
    )
  `
  console.log('✓ Seeded onerupee (₹1 final, iA26 only, unlimited uses)')
} else {
  console.log('· onerupee already exists — leaving as-is')
}

await p.$disconnect()
console.log('\nDone')
