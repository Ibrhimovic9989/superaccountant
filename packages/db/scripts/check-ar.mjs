import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g,'')
}
const { PrismaClient } = await import('@prisma/client')
const p = new PrismaClient()

// 1. Lessons
const lessons = await p.curriculumLesson.count()
const withArMdx = await p.curriculumLesson.count({ where: { contentArMdx: { not: '' } } })
console.log(`Lessons: ${lessons} total, ${withArMdx} with non-empty AR MDX`)

// Sample one
const s = await p.curriculumLesson.findFirst({ select: { slug: true, titleAr: true, contentArMdx: true } })
console.log(`Sample: ${s.slug}`)
console.log(`  titleAr: ${s.titleAr}`)
console.log(`  contentArMdx (first 200): ${s.contentArMdx.slice(0,200)}`)

// 2. AR chunks
const arChunks = await p.$queryRawUnsafe(`SELECT count(*)::int as n FROM "CurriculumLessonChunk" WHERE locale='ar'`)
const enChunks = await p.$queryRawUnsafe(`SELECT count(*)::int as n FROM "CurriculumLessonChunk" WHERE locale='en'`)
console.log(`Chunks: ${enChunks[0].n} EN, ${arChunks[0].n} AR`)

// 3. Assessment items — check if prompts have AR
const lessonsWithAssess = await p.curriculumLesson.findMany({ select: { slug: true, assessmentBlueprint: true }, take: 3 })
for (const l of lessonsWithAssess) {
  const items = l.assessmentBlueprint
  const sample = Array.isArray(items) ? items[0] : null
  console.log(`  ${l.slug} → first item prompt.ar: ${sample?.prompt?.ar?.slice(0,80) ?? '(none)'}`)
}

// 4. Entry test pool
const pool = await p.$queryRawUnsafe(`SELECT market, locale, count(*)::int as n FROM "EntryTestQuestionPool" GROUP BY market, locale ORDER BY market, locale`)
console.log('\nEntry test pool:')
for (const r of pool) console.log(`  ${r.market}/${r.locale}: ${r.n}`)

// 5. Media — count audio/video files per market
const fs = await import('node:fs/promises')
const path = await import('node:path')
for (const market of ['india','ksa']) {
  const root = path.resolve(__d, `../../../contexts/curriculum/seed/${market}/generated`)
  try {
    const slugs = await fs.readdir(root)
    let arMp3 = 0, enMp3 = 0, arMp4 = 0, enMp4 = 0
    for (const slug of slugs) {
      if (slug.startsWith('__')) continue
      try {
        const audioDir = path.join(root, slug, 'audio')
        const files = await fs.readdir(audioDir)
        for (const f of files) {
          if (f.endsWith('.ar.mp3')) arMp3++
          if (f.endsWith('.en.mp3')) enMp3++
        }
      } catch {}
      try { await fs.stat(path.join(root, slug, 'video.ar.mp4')); arMp4++ } catch {}
      try { await fs.stat(path.join(root, slug, 'video.en.mp4')); enMp4++ } catch {}
    }
    console.log(`\n${market} media: ${enMp3} EN MP3, ${arMp3} AR MP3, ${enMp4} EN MP4, ${arMp4} AR MP4`)
  } catch (e) { console.log(`${market}: ${e.message}`) }
}

await p.$disconnect()
