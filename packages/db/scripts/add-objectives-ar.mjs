// One-shot: add learningObjectivesAr JSONB column to CurriculumLesson.
// Cached translations land here on first AR render of each lesson.
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

await p.$executeRawUnsafe(
  `ALTER TABLE "CurriculumLesson" ADD COLUMN IF NOT EXISTS "learningObjectivesAr" JSONB`,
)
console.log('learningObjectivesAr column ready')
await p.$disconnect()
