#!/usr/bin/env node
/**
 * Mermaid Flowchart Audit — entry runner.
 *
 * One-off analysis tool. Scans every CurriculumLesson for mermaid sources
 * and scores them by clutter heuristics. Produces:
 *   - docs/lesson-flowchart-audit.md  (human-readable triage)
 *   - docs/lesson-flowchart-audit.json (raw scoring data)
 *
 * Re-runnable. Does NOT modify any lesson content.
 *
 * Sources scanned per lesson (see lib/audit-flowcharts/extract.mjs):
 *   1. flowchartMermaid column
 *   2. mindmapMermaid column
 *   3. ```mermaid``` fenced blocks inside contentEnMdx
 *   4. ```mermaid``` fenced blocks inside contentArMdx
 *
 * Run from the @sa/db package so @prisma/client resolves:
 *   cd packages/db && node ../../scripts/audit-flowcharts.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { extractMermaidSources } from './lib/audit-flowcharts/extract.mjs'
import { scoreSource } from './lib/audit-flowcharts/scoring.mjs'
import { renderMarkdown } from './lib/audit-flowcharts/report.mjs'

const __d = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__d, '..')
const FLAG_THRESHOLD = 15

// ── env loading (root first, then packages/db) ────────────────────────────
for (const envPath of [resolve(ROOT, '.env'), resolve(ROOT, 'packages/db/.env')]) {
  if (!existsSync(envPath)) continue
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
}

const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient()

console.log('Loading lessons…')
const lessons = await prisma.curriculumLesson.findMany({
  select: {
    id: true,
    slug: true,
    titleEn: true,
    titleAr: true,
    contentEnMdx: true,
    contentArMdx: true,
    flowchartMermaid: true,
    mindmapMermaid: true,
    module: { select: { titleEn: true, track: { select: { code: true } } } },
  },
  orderBy: { slug: 'asc' },
})
console.log(`Loaded ${lessons.length} lessons.`)

/** @type {any[]} */
const allBlocks = []
for (const lesson of lessons) {
  for (const { origin, source } of extractMermaidSources(lesson)) {
    const score = scoreSource(source)
    allBlocks.push({
      lessonId: lesson.id,
      slug: lesson.slug,
      titleEn: lesson.titleEn,
      track: lesson.module?.track?.code,
      module: lesson.module?.titleEn,
      origin,
      score,
      source,
    })
  }
}

await prisma.$disconnect()

const flagged = allBlocks.filter((b) => b.score.total >= FLAG_THRESHOLD)
flagged.sort((a, b) => b.score.total - a.score.total)

console.log(`Found ${allBlocks.length} mermaid blocks across ${lessons.length} lessons.`)
console.log(`Flagged ${flagged.length} blocks with score >= ${FLAG_THRESHOLD}.`)

// ── aggregates ────────────────────────────────────────────────────────────
const buckets = { '0-5': 0, '5-10': 0, '10-20': 0, '20+': 0 }
for (const b of allBlocks) {
  const s = b.score.total
  if (s < 5) buckets['0-5']++
  else if (s < 10) buckets['5-10']++
  else if (s < 20) buckets['10-20']++
  else buckets['20+']++
}

const heuristicHits = {
  noOrientation: 0,
  unquotedParensInSquares: 0,
  unquotedSpecialChars: 0,
  tooManyNodes: 0,
  tooManyLines: 0,
  tooManySubgraphs: 0,
  unusualType: 0,
}
for (const b of allBlocks) {
  const s = b.score
  if (s.noOrientation) heuristicHits.noOrientation++
  if (s.unquotedParensInSquares > 0) heuristicHits.unquotedParensInSquares++
  if (s.unquotedSpecialChars > 0) heuristicHits.unquotedSpecialChars++
  if (s.nodeCount > 12) heuristicHits.tooManyNodes++
  if (s.lineCount > 20) heuristicHits.tooManyLines++
  if (s.subgraphCount > 3) heuristicHits.tooManySubgraphs++
  if (s.hasUnusualType) heuristicHits.unusualType++
}

/** @type {Record<string, number>} */
const typeTally = {}
for (const b of allBlocks) {
  typeTally[b.score.chartType] = (typeTally[b.score.chartType] ?? 0) + 1
}

// ── write outputs ─────────────────────────────────────────────────────────
const docsDir = resolve(ROOT, 'docs')
if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true })

const today = new Date().toISOString().slice(0, 10)

writeFileSync(
  resolve(docsDir, 'lesson-flowchart-audit.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      lessonsAudited: lessons.length,
      blocksFound: allBlocks.length,
      blocksFlagged: flagged.length,
      flagThreshold: FLAG_THRESHOLD,
      buckets,
      heuristicHits,
      chartTypes: typeTally,
      blocks: allBlocks.map((b) => ({
        slug: b.slug,
        titleEn: b.titleEn,
        track: b.track,
        module: b.module,
        origin: b.origin,
        score: b.score,
      })),
      flagged: flagged.map((b) => ({
        slug: b.slug,
        origin: b.origin,
        total: b.score.total,
        flags: b.score.flags,
      })),
    },
    null,
    2,
  ),
)

writeFileSync(
  resolve(docsDir, 'lesson-flowchart-audit.md'),
  renderMarkdown({
    today,
    lessonsAudited: lessons.length,
    allBlocks,
    flagged,
    buckets,
    heuristicHits,
    typeTally,
  }),
)

console.log('Wrote:')
console.log(`  ${resolve(docsDir, 'lesson-flowchart-audit.md')}`)
console.log(`  ${resolve(docsDir, 'lesson-flowchart-audit.json')}`)
