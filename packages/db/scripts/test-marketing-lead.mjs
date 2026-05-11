import { randomUUID } from 'node:crypto'
// One-shot smoke test: insert a fake quiz lead, read it back, delete it.
// Run after running add-marketing-leads.mjs to confirm the table + write
// path is fully functional. Deletes the test row so prod data stays clean.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient()

const id = randomUUID()
const testEmail = `quiz-smoketest+${id.slice(0, 8)}@superaccountant.local`

try {
  // Insert
  await prisma.$executeRaw`
    INSERT INTO "MarketingLead" (
      "id", "name", "email", "phone", "source",
      "quizSlug", "quizScore", "quizBucket", "quizAnswers",
      "locale", "track", "userAgent"
    ) VALUES (
      ${id},
      ${'Smoke Test Lead'},
      ${testEmail},
      ${'+91 9999999999'},
      ${'/quiz'},
      ${'accountant-dna'},
      ${32},
      ${'born'},
      ${JSON.stringify({ 'restaurant-bill': 'check-every-line', spreadsheet: 'exciting' })}::jsonb,
      ${'en'},
      ${null},
      ${'smoke-test'}
    )
  `
  console.log(`✓ Inserted lead id=${id}`)

  // Read back
  const rows = await prisma.$queryRaw`
    SELECT "id", "name", "email", "phone", "source", "quizSlug",
           "quizScore", "quizBucket", "quizAnswers", "locale", "createdAt"
    FROM "MarketingLead"
    WHERE "id" = ${id}
    LIMIT 1
  `
  if (rows.length !== 1) throw new Error('row not found after insert')
  const row = rows[0]
  console.log('✓ Read back:')
  console.log(`  name=${row.name}`)
  console.log(`  email=${row.email}`)
  console.log(`  phone=${row.phone}`)
  console.log(`  source=${row.source} quizSlug=${row.quizSlug}`)
  console.log(`  score=${row.quizScore} bucket=${row.quizBucket}`)
  console.log(`  answers=${JSON.stringify(row.quizAnswers)}`)
  console.log(`  locale=${row.locale}`)
  console.log(`  createdAt=${row.createdAt.toISOString()}`)

  // Sanity: required fields all present
  if (!row.name) throw new Error('name missing')
  if (!row.email) throw new Error('email missing')
  if (!row.phone) throw new Error('phone missing')
  if (typeof row.quizScore !== 'number') throw new Error('quizScore not stored as int')
  if (!row.quizBucket) throw new Error('quizBucket missing')
  if (!row.quizAnswers || typeof row.quizAnswers !== 'object') {
    throw new Error('quizAnswers not stored as JSONB')
  }

  // Clean up
  await prisma.$executeRaw`DELETE FROM "MarketingLead" WHERE "id" = ${id}`
  console.log('✓ Deleted test row')

  // Final count for confidence
  const count = await prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM "MarketingLead"`
  console.log(`\nMarketingLead table currently holds ${count[0].n} real lead(s).`)
  console.log('\n✓ Smoke test passed — quiz lead capture path is healthy.')
} catch (err) {
  console.error('✗ Smoke test FAILED:', err.message)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
