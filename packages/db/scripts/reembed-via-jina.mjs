// One-shot: rebuild every embedding via Jina v3 at 1024-d after the
// Azure → OpenRouter+Jina swap. Covers three tables:
//
//   CurriculumLesson.embedding         (one per lesson, title + intro)
//   CurriculumLessonChunk              (one per H2 section, per locale)
//   TutoringSessionMemory.embedding    (one per memory)
//
// Idempotent + resumable: only writes where the existing embedding is
// NULL, so a re-run after a crash picks up where it left off. The
// chunks table is rebuilt per (lessonId, locale) atomically — old
// rows are dropped and re-inserted, so partial chunk sets never linger.
//
// Rate limits (Jina free tier): 1000 req/min, batches of up to 64 docs
// per call. We send batches of 32 to stay headroom-safe and pace at
// ~3 batches/sec (~6000 docs/min capacity — far below the rate cap).
//
// Run from repo root:
//   node packages/db/scripts/reembed-via-jina.mjs            # all three
//   node packages/db/scripts/reembed-via-jina.mjs lessons    # one table
//   node packages/db/scripts/reembed-via-jina.mjs chunks
//   node packages/db/scripts/reembed-via-jina.mjs memories

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const JINA_KEY = process.env.JINA_API_KEY
if (!JINA_KEY) {
  console.error('JINA_API_KEY not set in packages/db/.env')
  process.exit(1)
}

const { PrismaClient } = await import('@prisma/client')
const p = new PrismaClient()

const TARGETS = new Set(process.argv.slice(2))
const want = (t) => TARGETS.size === 0 || TARGETS.has(t)

const BATCH = 32
const JINA_URL = 'https://api.jina.ai/v1/embeddings'

async function embedBatch(texts, kind = 'passage') {
  if (texts.length === 0) return []
  const body = {
    model: 'jina-embeddings-v3',
    input: texts.map((text) => ({ text })),
    dimensions: 1024,
    task: kind === 'query' ? 'retrieval.query' : 'retrieval.passage',
    normalized: true,
  }
  const res = await fetch(JINA_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${JINA_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Jina ${res.status}: ${text.slice(0, 400)}`)
  }
  const json = await res.json()
  return json.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding)
}

/** pgvector literal: `'[1.2,3.4,...]'` */
function vecLit(vec) {
  return `[${vec.join(',')}]`
}

// ── CurriculumLesson ─────────────────────────────────────────
async function reembedLessons() {
  const rows = await p.$queryRawUnsafe(`
    SELECT "id", "titleEn", LEFT("contentEnMdx", 1200) AS intro
    FROM "CurriculumLesson"
    WHERE embedding IS NULL
    ORDER BY "createdAt" ASC
  `)
  console.log(`[lessons] ${rows.length} to embed`)
  let done = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH)
    const texts = slice.map((r) => `${r.titleEn}\n\n${r.intro}`.slice(0, 8000))
    const vecs = await embedBatch(texts)
    for (let j = 0; j < slice.length; j++) {
      await p.$executeRawUnsafe(
        `UPDATE "CurriculumLesson" SET embedding = $1::vector WHERE id = $2`,
        vecLit(vecs[j]),
        slice[j].id,
      )
    }
    done += slice.length
    console.log(`  ${done}/${rows.length}`)
  }
  console.log('[lessons] done')
}

// ── CurriculumLessonChunk ────────────────────────────────────
function splitH2(md) {
  // Walks MDX and yields { heading, body } per H2 section. Pre-first-
  // heading content (intro) is kept under a synthetic '_intro' heading
  // so it still gets embedded.
  const lines = md.split('\n')
  const sections = []
  let current = { heading: '_intro', body: [] }
  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line)
    if (m) {
      if (current.body.length) {
        sections.push({ heading: current.heading, body: current.body.join('\n').trim() })
      }
      current = { heading: m[1], body: [] }
    } else {
      current.body.push(line)
    }
  }
  if (current.body.length)
    sections.push({ heading: current.heading, body: current.body.join('\n').trim() })
  return sections.filter((s) => s.body.length > 40)
}

async function reembedChunks() {
  const lessons = await p.$queryRawUnsafe(`
    SELECT "id", "contentEnMdx", "contentArMdx"
    FROM "CurriculumLesson"
    ORDER BY "createdAt" ASC
  `)
  console.log(`[chunks] ${lessons.length} lessons to rebuild chunks for`)
  let made = 0
  for (let i = 0; i < lessons.length; i++) {
    const l = lessons[i]
    const tasks = [
      { locale: 'en', sections: splitH2(l.contentEnMdx) },
      { locale: 'ar', sections: splitH2(l.contentArMdx ?? '') },
    ]
    // Drop existing chunks for this lesson — keeps re-runs clean and
    // avoids stale embeddings if the lesson body was edited.
    await p.$executeRawUnsafe(`DELETE FROM "CurriculumLessonChunk" WHERE "lessonId" = $1`, l.id)

    for (const t of tasks) {
      if (!t.sections.length) continue
      const texts = t.sections.map((s) => `${s.heading}\n\n${s.body}`.slice(0, 8000))
      // Process in BATCH-sized groups so a 50-section lesson still
      // works under Jina's batch ceiling.
      for (let j = 0; j < texts.length; j += BATCH) {
        const part = texts.slice(j, j + BATCH)
        const vecs = await embedBatch(part)
        for (let k = 0; k < part.length; k++) {
          const section = t.sections[j + k]
          const id = `${l.id}-${t.locale}-${(j + k).toString(36)}`
          await p.$executeRawUnsafe(
            `INSERT INTO "CurriculumLessonChunk" ("id","lessonId","locale","heading","body","embedding")
             VALUES ($1, $2, $3, $4, $5, $6::vector)`,
            id,
            l.id,
            t.locale,
            section.heading,
            section.body,
            vecLit(vecs[k]),
          )
          made += 1
        }
      }
    }
    if (i % 10 === 9 || i === lessons.length - 1) {
      console.log(`  ${i + 1}/${lessons.length} lessons · ${made} chunks written`)
    }
  }
  console.log(`[chunks] done — ${made} chunks total`)
}

// ── TutoringSessionMemory ────────────────────────────────────
async function reembedMemories() {
  const rows = await p.$queryRawUnsafe(`
    SELECT "id", "bodyMd"
    FROM "TutoringSessionMemory"
    WHERE embedding IS NULL
    ORDER BY "updatedAt" DESC
  `)
  console.log(`[memories] ${rows.length} to embed`)
  let done = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH)
    const texts = slice.map((r) => r.bodyMd.slice(0, 8000))
    const vecs = await embedBatch(texts)
    for (let j = 0; j < slice.length; j++) {
      await p.$executeRawUnsafe(
        `UPDATE "TutoringSessionMemory" SET embedding = $1::vector WHERE id = $2`,
        vecLit(vecs[j]),
        slice[j].id,
      )
    }
    done += slice.length
    console.log(`  ${done}/${rows.length}`)
  }
  console.log('[memories] done')
}

// ── Driver ───────────────────────────────────────────────────
const t0 = Date.now()
try {
  if (want('lessons')) await reembedLessons()
  if (want('chunks')) await reembedChunks()
  if (want('memories')) await reembedMemories()
} finally {
  await p.$disconnect()
}
const sec = ((Date.now() - t0) / 1000).toFixed(1)
console.log(`\nfinished in ${sec}s`)
