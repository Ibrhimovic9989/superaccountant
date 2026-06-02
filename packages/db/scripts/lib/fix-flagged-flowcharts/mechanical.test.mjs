/**
 * Unit tests for the mechanical mermaid sanitization rules.
 * Pure in-process — no DB, no network. Run with:
 *   node --test packages/db/scripts/lib/fix-flagged-flowcharts/mechanical.test.mjs
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  applyMechanicalFixes,
  ensureFlowchartOrientation,
  fixEmDashArrows,
  quoteRiskyLabels,
  replaceFirstMermaidFence,
} from './mechanical.mjs'

// ── Rule 1: parens inside [ ] / { } ──────────────────────────────────────
test('quoteRiskyLabels — quotes parens in [ ] labels', () => {
  const src = 'A[Foo (KSA)]'
  assert.equal(quoteRiskyLabels(src), 'A["Foo (KSA)"]')
})

test('quoteRiskyLabels — quotes parens in { } diamonds', () => {
  const src = 'B{Choice (yes)}'
  assert.equal(quoteRiskyLabels(src), 'B{"Choice (yes)"}')
})

// ── Rule 2: specials (& % / : —) ─────────────────────────────────────────
test('quoteRiskyLabels — quotes & in label', () => {
  assert.equal(quoteRiskyLabels('A[Profit & Loss]'), 'A["Profit & Loss"]')
})

test('quoteRiskyLabels — quotes / in label', () => {
  assert.equal(quoteRiskyLabels('A[CGST/SGST]'), 'A["CGST/SGST"]')
})

test('quoteRiskyLabels — quotes : in label', () => {
  assert.equal(quoteRiskyLabels('A[Start: House Property]'), 'A["Start: House Property"]')
})

// ── Rule 3: em-dash arrows ───────────────────────────────────────────────
test('fixEmDashArrows — em-dash arrow becomes -->', () => {
  assert.equal(fixEmDashArrows('A —> B'), 'A --> B')
})

test('fixEmDashArrows — en-dash arrow becomes -->', () => {
  assert.equal(fixEmDashArrows('A –> B'), 'A --> B')
})

test('fixEmDashArrows — em-dashes inside a quoted label are untouched', () => {
  // The arrow regex is `—>` / `–>` — em-dash NOT followed by `>` is left alone.
  const src = 'A["Profit — Loss"] --> B'
  assert.equal(fixEmDashArrows(src), 'A["Profit — Loss"] --> B')
})

// ── Rule 4: orientation injection ────────────────────────────────────────
test('ensureFlowchartOrientation — adds LR to bare flowchart', () => {
  assert.equal(
    ensureFlowchartOrientation('flowchart\nA --> B'),
    'flowchart LR\nA --> B',
  )
})

test('ensureFlowchartOrientation — leaves existing LR alone', () => {
  assert.equal(
    ensureFlowchartOrientation('flowchart LR\nA --> B'),
    'flowchart LR\nA --> B',
  )
})

test('ensureFlowchartOrientation — does not touch mindmap', () => {
  assert.equal(
    ensureFlowchartOrientation('mindmap\n  root\n    leaf'),
    'mindmap\n  root\n    leaf',
  )
})

// ── Rule 5: <br/> in unquoted labels ────────────────────────────────────
test('quoteRiskyLabels — <br/> in unquoted label triggers quote + dash', () => {
  // Renderer behaviour: <br/> → ' — ', then em/en-dash → '-'.
  assert.equal(
    quoteRiskyLabels('A[Sec 192<br/>Salary TDS]'),
    'A["Sec 192 - Salary TDS"]',
  )
})

test('quoteRiskyLabels — already-quoted body is left untouched (idempotency)', () => {
  const src = 'A["Sec 192 - Salary TDS"]'
  assert.equal(quoteRiskyLabels(src), src)
})

// ── Pipeline / idempotency ───────────────────────────────────────────────
test('applyMechanicalFixes — full pipeline on a representative bad block', () => {
  const src = [
    'flowchart',
    'A[Identify Payment] --> B{Salary?}',
    'B -->|Yes| S192[Sec 192<br/>Salary TDS]',
    'B -->|No| C{Interest?}',
    'C -->|Yes| S194A[Sec 194A<br/>Interest (Non-Salary)]',
  ].join('\n')

  const fixed = applyMechanicalFixes(src)
  assert.match(fixed, /^flowchart LR/)
  assert.match(fixed, /S192\["Sec 192 - Salary TDS"\]/)
  assert.match(fixed, /S194A\["Sec 194A - Interest \(Non-Salary\)"\]/)
})

test('applyMechanicalFixes — fixed point: re-running yields identical output', () => {
  const src = [
    'flowchart',
    'A[Profit & Loss] --> B[Foo (KSA)]',
    'B --> C{Choice (yes)}',
  ].join('\n')
  const once = applyMechanicalFixes(src)
  const twice = applyMechanicalFixes(once)
  assert.equal(twice, once)
})

test('applyMechanicalFixes — clean source is returned unchanged (reference equality)', () => {
  const src = 'flowchart LR\nA[Plain] --> B[Also Plain]'
  assert.equal(applyMechanicalFixes(src), src)
})

test('applyMechanicalFixes — handles null/undefined safely', () => {
  assert.equal(applyMechanicalFixes(''), '')
  assert.equal(applyMechanicalFixes(/** @type {any} */ (null)), null)
  assert.equal(applyMechanicalFixes(/** @type {any} */ (undefined)), undefined)
})

// ── MDX fence replacement ────────────────────────────────────────────────
test('replaceFirstMermaidFence — replaces inside an MDX body', () => {
  const mdx = [
    'Intro text',
    '',
    '```mermaid',
    'flowchart LR',
    'A --> B',
    '```',
    '',
    'Outro',
  ].join('\n')
  const out = replaceFirstMermaidFence(mdx, 'flowchart LR\nA --> C')
  assert.match(out, /A --> C/)
  assert.doesNotMatch(out, /A --> B/)
  assert.match(out, /Intro text/)
  assert.match(out, /Outro/)
})

test('replaceFirstMermaidFence — no fence returns original (===)', () => {
  const mdx = 'Just prose, no diagrams.'
  assert.equal(replaceFirstMermaidFence(mdx, 'x'), mdx)
})
