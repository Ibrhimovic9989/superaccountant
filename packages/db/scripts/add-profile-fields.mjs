// One-shot: add profile columns to IdentityUser.
// Collected post-market-pick during onboarding, used to personalize the tutor.
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
const { PrismaClient } = await import('@prisma/client')
const p = new PrismaClient()

const cols = [
  ['phone', 'TEXT'],
  ['country', 'TEXT'],
  ['city', 'TEXT'],
  ['currentRole', 'TEXT'],
  ['currentEmployer', 'TEXT'],
  ['experienceYears', 'INTEGER'],
  ['examGoal', 'TEXT'],
  ['studyHoursPerWeek', 'INTEGER'],
  ['targetExamDate', 'TIMESTAMP(3)'],
  ['motivation', 'TEXT'],
  ['profileCompletedAt', 'TIMESTAMP(3)'],
]

for (const [name, type] of cols) {
  await p.$executeRawUnsafe(
    `ALTER TABLE "IdentityUser" ADD COLUMN IF NOT EXISTS "${name}" ${type}`,
  )
  console.log(`✓ ${name} ${type}`)
}

await p.$disconnect()
console.log('\nProfile columns ready')
