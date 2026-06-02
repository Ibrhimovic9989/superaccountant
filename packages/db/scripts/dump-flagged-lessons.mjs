// One-shot helper: dump the 35 flagged lessons (id, slug, all 4 mermaid-bearing
// columns + their audit flags) to packages/db/scripts/flagged-lessons-dump.json
// so the rewrite agent can produce a fix script without DB access.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__d, '../../..')
for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const { PrismaClient } = await import('@prisma/client')
const p = new PrismaClient()

const audit = JSON.parse(
  readFileSync(resolve(ROOT, 'docs/lesson-flowchart-audit.json'), 'utf8'),
)
const flagged = audit.flagged || []
const slugs = [...new Set(flagged.map((b) => b.slug))]
console.log(`flagged blocks: ${flagged.length}; unique lessons: ${slugs.length}`)

const lessons = await p.curriculumLesson.findMany({
  where: { slug: { in: slugs } },
  select: {
    id: true,
    slug: true,
    titleEn: true,
    contentEnMdx: true,
    contentArMdx: true,
    flowchartMermaid: true,
    mindmapMermaid: true,
  },
})

const auditBySlug = {}
for (const b of flagged) {
  if (!auditBySlug[b.slug]) auditBySlug[b.slug] = []
  auditBySlug[b.slug].push({ origin: b.origin, totalScore: b.total, flags: b.flags })
}
const out = lessons.map((l) => ({ ...l, auditFlags: auditBySlug[l.slug] || [] }))

const outPath = resolve(__d, 'flagged-lessons-dump.json')
writeFileSync(outPath, JSON.stringify(out, null, 2))
console.log(`wrote dump: ${out.length} lessons → ${outPath}`)
await p.$disconnect()
