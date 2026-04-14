// Add audioUrlEn + audioUrlAr columns to CurriculumLesson.
// Populated by scripts/generate-lesson-audio.mjs.
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

for (const col of ['audioUrlEn', 'audioUrlAr']) {
  await p.$executeRawUnsafe(
    `ALTER TABLE "CurriculumLesson" ADD COLUMN IF NOT EXISTS "${col}" TEXT`,
  )
  console.log(`✓ ${col}`)
}

await p.$disconnect()
