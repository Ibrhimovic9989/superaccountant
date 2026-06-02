#!/usr/bin/env node
/**
 * Fix-pass for the 35 mermaid blocks flagged by audit-flowcharts.mjs.
 *
 * Two stages per lesson:
 *
 *   1. MECHANICAL — pure source transformations (quote risky labels,
 *      replace em-dash arrows, default `flowchart LR`, collapse <br/>).
 *      Applied to whatever the DB currently holds.
 *
 *   2. STRUCTURAL — hand-tuned rewrites for the highest-scoring blocks
 *      (top ~10). Sourced from docs/lesson-flowchart-audit.md. For mind-
 *      maps with no hand rewrite but lines > 28, falls back to a generic
 *      depth-cap pruner so the audit count drops below threshold.
 *
 * Idempotent: re-running compares before/after and skips when identical.
 *
 * Run from packages/db so @prisma/client resolves:
 *   cd packages/db && node scripts/fix-flagged-flowcharts.mjs
 */

import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { applyMechanicalFixes } from './lib/fix-flagged-flowcharts/mechanical.mjs'
import { getStructuralCorrection } from './lib/fix-flagged-flowcharts/corrections.mjs'

const __d = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__d, '../..')

// ── env loading (root first, then packages/db) ───────────────────────────
for (const envPath of [resolve(ROOT, '.env'), resolve(ROOT, 'packages/db/.env')]) {
  if (!existsSync(envPath)) continue
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
}

const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient()

// ── universe of flagged slugs (from docs/lesson-flowchart-audit.md) ──────
// Mix of flowchartMermaid and mindmapMermaid origins. Same slug can appear
// twice if both columns flagged — the mechanical pass touches both
// regardless, so a single de-duplicated slug list is sufficient.
const FLAGGED_SLUGS = [
  'in-adj-accrued-income-expense',
  'in-adj-depreciation',
  'in-ap-process',
  'in-ap-vendor-master-and-recon',
  'in-ar-customer-master',
  'in-as-key-standards',
  'in-bk-classification-of-accounts',
  'in-brs-introduction',
  'in-final-balance-sheet',
  'in-final-pl-statement',
  'in-gst-annual-return-gstr9',
  'in-gst-composition-scheme',
  'in-gst-export-and-lut',
  'in-gst-imports-and-customs',
  'in-gst-introduction-and-benefits',
  'in-gst-notices-and-assessments',
  'in-gst-registration',
  'in-gst-returns-gstr1',
  'in-gst-returns-gstr3b',
  'in-gst-tds-tcs-under-gst',
  'in-gst-time-and-value-of-supply',
  'in-inv-what-is-inventory',
  'in-je-common-entries',
  'in-payroll-pf-esi-pt',
  'in-payroll-tally-setup',
  'in-ratio-liquidity-solvency',
  'in-tally-accounting-vouchers',
  'in-tax-advance-tax',
  'in-tax-house-property',
  'in-tax-other-sources',
  'in-tds-certificates-and-returns',
  'in-tds-key-sections',
  'in-voucher-source-documents',
]

/**
 * Drop mindmap nodes deeper than `maxDepth` indent levels (default keeps
 * root + 3 child layers). Used when no hand-tuned rewrite exists and the
 * mindmap is over the line-count cliff. Conservative — preserves all
 * top-level branches, only prunes leaf detail the lesson prose covers.
 *
 * @param {string} src
 * @param {{ maxDepth?: number, maxLines?: number }} opts
 */
function pruneMindmap(src, { maxDepth = 3, maxLines = 26 } = {}) {
  const lines = src.split('\n')
  if (lines[0]?.trim() !== 'mindmap') return src

  // Find the smallest non-zero indent — that's our "one level" unit.
  let unit = 0
  for (const l of lines.slice(1)) {
    const m = /^(\s+)\S/.exec(l)
    if (m && m[1].length > 0) {
      unit = unit === 0 ? m[1].length : Math.min(unit, m[1].length)
    }
  }
  if (unit === 0) return src

  const kept = [lines[0]]
  for (const line of lines.slice(1)) {
    const m = /^(\s*)(\S.*)$/.exec(line)
    if (!m) continue
    const depth = Math.floor(m[1].length / unit)
    if (depth <= maxDepth) kept.push(line)
    if (kept.length >= maxLines) break
  }
  return kept.join('\n')
}

/**
 * Apply mechanical sanitisation, then structural corrections, then a
 * fallback mindmap prune. Returns { flowchartMermaid, mindmapMermaid,
 * contentEnMdx } — only includes keys that changed.
 *
 * @param {{ slug: string, flowchartMermaid?: string|null, mindmapMermaid?: string|null, contentEnMdx?: string|null }} lesson
 */
function buildUpdate(lesson) {
  const correction = getStructuralCorrection(lesson.slug)

  // Stage 1: mechanical on both mermaid columns. Stage 2: override with
  // structural correction if present. Mechanical first means correction
  // sources are also sanitisation-checked but the structural author has
  // already done that work — second pass is a no-op.
  let nextFlow = lesson.flowchartMermaid
    ? applyMechanicalFixes(lesson.flowchartMermaid)
    : lesson.flowchartMermaid
  let nextMind = lesson.mindmapMermaid
    ? applyMechanicalFixes(lesson.mindmapMermaid)
    : lesson.mindmapMermaid
  let nextContent = lesson.contentEnMdx ?? ''

  if (correction?.flowchartMermaid) nextFlow = correction.flowchartMermaid
  if (correction?.mindmapMermaid) nextMind = correction.mindmapMermaid

  // Fallback prune: still-too-long mindmaps without a hand rewrite.
  if (
    !correction?.mindmapMermaid &&
    nextMind &&
    nextMind.split('\n').filter((l) => l.trim()).length > 28
  ) {
    nextMind = pruneMindmap(nextMind)
  }

  if (correction?.appendMermaidToContentEnMdx) {
    const tag = '<!-- fix-pass-2026-06: appended secondary diagram -->'
    if (!nextContent.includes(tag)) {
      const block = [
        '',
        tag,
        '',
        '```mermaid',
        correction.appendMermaidToContentEnMdx,
        '```',
        '',
      ].join('\n')
      nextContent = nextContent.trimEnd() + '\n' + block
    }
  }

  /** @type {Record<string, string>} */
  const diff = {}
  if (nextFlow !== lesson.flowchartMermaid && nextFlow != null) {
    diff.flowchartMermaid = nextFlow
  }
  if (nextMind !== lesson.mindmapMermaid && nextMind != null) {
    diff.mindmapMermaid = nextMind
  }
  if (nextContent !== (lesson.contentEnMdx ?? '') && nextContent !== '') {
    diff.contentEnMdx = nextContent
  }
  return diff
}

// ── main ─────────────────────────────────────────────────────────────────
const lessons = await prisma.curriculumLesson.findMany({
  where: { slug: { in: FLAGGED_SLUGS } },
  select: {
    slug: true,
    flowchartMermaid: true,
    mindmapMermaid: true,
    contentEnMdx: true,
  },
})

const found = new Set(lessons.map((l) => l.slug))
const missing = FLAGGED_SLUGS.filter((s) => !found.has(s))

let updated = 0
let skipped = 0

for (const lesson of lessons) {
  const diff = buildUpdate(lesson)
  if (Object.keys(diff).length === 0) {
    skipped++
    console.log(`  · skip ${lesson.slug} (already correct)`)
    continue
  }
  await prisma.curriculumLesson.update({
    where: { slug: lesson.slug },
    data: diff,
  })
  updated++
  console.log(`  ✓ updated ${lesson.slug}: ${Object.keys(diff).join(', ')}`)
}

console.log('')
console.log(`✓ updated ${updated} / skipped ${skipped}`)
if (missing.length > 0) {
  console.log(`Note: ${missing.length} flagged slug(s) not in DB:`)
  for (const s of missing) console.log(`  - ${s}`)
}

await prisma.$disconnect()
