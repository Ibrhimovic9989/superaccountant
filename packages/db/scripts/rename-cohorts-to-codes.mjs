// Rename cohorts to short codes per the new convention:
//   <country><letter><year>
//   i = India, s = Saudi (KSA)
//   A = 1st cohort of the year, B = 2nd, ...
//   26 = year 2026
//
// e.g. iA26 = India, 1st cohort of 2026; sA26 = Saudi 1st cohort of 2026.
//
// Only renames the `name` column (the user-facing label) — slugs + ids
// are left untouched so foreign keys and discount codes stay stable.
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

const renames = [
  { id: 'cohort-mumbai-jun-2026', name: 'iA26' },
  { id: 'cohort-riyadh-jul-2026', name: 'sA26' },
]

for (const r of renames) {
  const result = await p.$executeRaw`
    UPDATE "Cohort"
    SET "name" = ${r.name}, "updatedAt" = NOW()
    WHERE "id" = ${r.id}
  `
  console.log(`✓ ${r.id} → ${r.name} (rows: ${result})`)
}

await p.$disconnect()
console.log('\nCohort codes applied')
