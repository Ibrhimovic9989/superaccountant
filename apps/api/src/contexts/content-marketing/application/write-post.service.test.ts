/**
 * Tests for WritePostService — focused on the Zod parser + retry guard.
 *
 * We don't call Azure here. The pure surface is the parser:
 * `tryParse(rawString) -> { ok: true, value } | { ok: false, issues }`.
 *
 * Coverage:
 *  - Strict JSON happy path
 *  - JSON wrapped in ```json fences (model's most common quirk)
 *  - Missing required fields → ok=false with helpful issue paths
 *  - Short body (< 2 000 chars) → fails contentMdx min length
 *  - Bad slug shape → fails the regex
 *  - Meta description > 160 chars → fails max length
 *  - Empty string → ok=false
 */

import { describe, expect, it } from 'vitest'
import { tryParse } from './write-post.service'

const longBody = '# Heading\n\n'.padEnd(2_200, 'x') // ensure >= MIN_CONTENT_LEN

const goodDraft = {
  title: 'GSTR-3B Late Fee Waiver Explained for Indian Accountants',
  slug: 'gstr-3b-late-fee-waiver-2026',
  subtitle: 'CBIC has quietly extended the late-fee waiver — here\'s who qualifies and how to file.',
  metaDescription:
    'CBIC Notification 14/2026 extends the GSTR-3B late-fee waiver. Eligibility, deadlines, and the exact filing steps for Indian accountants this June.',
  contentMdx: longBody,
  targetKeywords: [
    'gstr-3b late fee waiver',
    'cbic notification 14 2026',
    'gst return filing 2026',
    'late fee waiver india',
  ],
  market: 'india' as const,
}

describe('tryParse — happy path', () => {
  it('accepts a well-formed JSON draft', () => {
    const out = tryParse(JSON.stringify(goodDraft))
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.value.slug).toBe(goodDraft.slug)
  })

  it('recovers a draft wrapped in ```json fences', () => {
    const raw = ['Here is the post:', '```json', JSON.stringify(goodDraft), '```'].join('\n')
    const out = tryParse(raw)
    expect(out.ok).toBe(true)
  })
})

describe('tryParse — failure cases retrigger retry', () => {
  it('flags a missing required field with a useful issue path', () => {
    const bad = { ...goodDraft } as Partial<typeof goodDraft>
    delete bad.title
    const out = tryParse(JSON.stringify(bad))
    expect(out.ok).toBe(false)
    if (!out.ok) {
      expect(out.issues.some((i) => i.toLowerCase().includes('title'))).toBe(true)
    }
  })

  it('flags a body shorter than the minimum length', () => {
    const bad = { ...goodDraft, contentMdx: 'too short' }
    const out = tryParse(JSON.stringify(bad))
    expect(out.ok).toBe(false)
    if (!out.ok) {
      expect(out.issues.some((i) => i.includes('contentMdx'))).toBe(true)
    }
  })

  it('flags a slug that is not kebab-case', () => {
    const bad = { ...goodDraft, slug: 'Bad Slug With Spaces' }
    const out = tryParse(JSON.stringify(bad))
    expect(out.ok).toBe(false)
    if (!out.ok) {
      expect(out.issues.some((i) => i.includes('slug'))).toBe(true)
    }
  })

  it('flags a meta description above the max length', () => {
    const bad = { ...goodDraft, metaDescription: 'a'.repeat(200) }
    const out = tryParse(JSON.stringify(bad))
    expect(out.ok).toBe(false)
    if (!out.ok) {
      expect(out.issues.some((i) => i.includes('metaDescription'))).toBe(true)
    }
  })

  it('flags an unparseable string', () => {
    const out = tryParse('not json at all')
    expect(out.ok).toBe(false)
  })

  it('flags an empty string with a clear reason', () => {
    const out = tryParse('')
    expect(out.ok).toBe(false)
    if (!out.ok) {
      expect(out.issues.join(' ').toLowerCase()).toContain('empty')
    }
  })

  it('flags too few target keywords', () => {
    const bad = { ...goodDraft, targetKeywords: ['only-one'] }
    const out = tryParse(JSON.stringify(bad))
    expect(out.ok).toBe(false)
    if (!out.ok) {
      expect(out.issues.some((i) => i.includes('targetKeywords'))).toBe(true)
    }
  })
})
