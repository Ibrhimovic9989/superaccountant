// One-off: seed the Saudi Mu'tamad cohort so the /cohort page can
// offer track selection with two real, payable cohorts.
//
// SAR 4,999 (50% off SAR 9,999 launch price), starts 1 July 2026.
// City placeholder — adjust via SQL when the venue is locked.
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

const SEED_ID = 'cohort-riyadh-jul-2026'
const existing = await p.$queryRaw`SELECT "id" FROM "Cohort" WHERE "id" = ${SEED_ID} LIMIT 1`
if (existing.length === 0) {
  await p.$executeRaw`
    INSERT INTO "Cohort" (
      "id", "slug", "track", "name", "city",
      "startDate", "durationDays",
      "currency", "originalPriceMinor", "discountedPriceMinor",
      "seatsTotal", "status"
    ) VALUES (
      ${SEED_ID},
      ${'riyadh-jul-2026'},
      ${'ksa'},
      ${'Riyadh — July 2026'},
      ${'Riyadh'},
      ${'2026-07-01'}::date,
      ${45},
      ${'SAR'},
      ${999900},
      ${499900},
      ${30},
      ${'open'}
    )
  `
  console.log(`✓ Seeded Saudi cohort ${SEED_ID} (SAR 4,999 from SAR 9,999, starts 1 Jul 2026)`)
} else {
  console.log(`· Saudi cohort ${SEED_ID} already seeded — leaving as-is`)
}

await p.$disconnect()
console.log('\nSaudi cohort ready')
