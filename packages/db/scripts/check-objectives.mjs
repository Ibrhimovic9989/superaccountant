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
const r = await p.$queryRawUnsafe(
  `SELECT slug, "learningObjectives" as en, "learningObjectivesAr" as ar FROM "CurriculumLesson" WHERE slug = 'in-intro-what-is-accounting'`,
)
console.log(JSON.stringify(r[0], null, 2))
await p.$disconnect()
