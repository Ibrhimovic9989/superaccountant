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
const lessons = await p.curriculumLesson.findMany({
  select: { id: true, slug: true, titleEn: true, contentEnMdx: true },
})
for (const l of lessons) {
  console.log(`✓ lesson ${l.slug}  id=${l.id}  body=${l.contentEnMdx.length}ch`)
}
const chunks = await p.$queryRawUnsafe(
  `SELECT locale, heading, length(body) as body_len FROM "CurriculumLessonChunk" ORDER BY locale, heading`,
)
console.log(`\n${chunks.length} chunks:`)
for (const c of chunks) console.log(`  · [${c.locale}] ${c.heading}  (${c.body_len}ch)`)
await p.$disconnect()
