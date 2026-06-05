/**
 * Tests for the Perplexity response parser. We do NOT exercise the
 * network here — the parser is pure given a raw string and that's the
 * whole point of factoring it out. Coverage:
 *
 *  - Strict happy path: `{ topics: [...] }`
 *  - Bare-array shape: `[ ... ]` at the top level
 *  - JSON-wrapped-in-prose recovery (the ```json fence path)
 *  - Mixed valid/invalid items: valid ones pass through
 *  - Pure garbage / empty input → []
 */

import { describe, expect, it } from 'vitest'
import { parseResearchResponse } from './perplexity.client'

const goodItem = {
  topic: 'GSTR-3B late fee waiver — what changed in June 2026',
  summary: 'CBIC notification 14/2026 extended the waiver window for non-filers.',
  keywords: ['gstr-3b late fee', 'cbic notification 14 2026', 'gst waiver 2026'],
  urgency: 'high',
}

describe('parseResearchResponse', () => {
  it('parses the canonical { topics: [...] } shape', () => {
    const raw = JSON.stringify({ topics: [goodItem] })
    const out = parseResearchResponse(raw)
    expect(out).toHaveLength(1)
    expect(out[0]?.topic).toContain('GSTR-3B')
    expect(out[0]?.urgency).toBe('high')
    expect(out[0]?.keywords.length).toBeGreaterThan(0)
  })

  it('parses a bare top-level array', () => {
    const raw = JSON.stringify([goodItem, goodItem])
    const out = parseResearchResponse(raw)
    expect(out).toHaveLength(2)
  })

  it('recovers JSON wrapped in ```json fences', () => {
    const raw = [
      "Here are the trending topics for this week:",
      '```json',
      JSON.stringify({ topics: [goodItem] }),
      '```',
      'Hope that helps!',
    ].join('\n')
    const out = parseResearchResponse(raw)
    expect(out).toHaveLength(1)
    expect(out[0]?.topic).toContain('GSTR-3B')
  })

  it('drops items that fail Zod validation but keeps the valid ones', () => {
    const bad = { topic: 'no urgency', summary: 'missing fields', keywords: [] }
    const raw = JSON.stringify({ topics: [goodItem, bad, goodItem] })
    const out = parseResearchResponse(raw)
    expect(out).toHaveLength(2)
  })

  it('normalises keywords to lowercase + trims', () => {
    const itemWithMess = {
      ...goodItem,
      keywords: ['  GSTR-3B Late Fee ', 'CBIC Notification 14 2026'],
    }
    const raw = JSON.stringify({ topics: [itemWithMess] })
    const out = parseResearchResponse(raw)
    expect(out[0]?.keywords).toEqual(['gstr-3b late fee', 'cbic notification 14 2026'])
  })

  it('preserves optional competitorCoverageGap when present', () => {
    const withGap = { ...goodItem, competitorCoverageGap: 'no top-10 article cites the new circular' }
    const raw = JSON.stringify({ topics: [withGap] })
    const out = parseResearchResponse(raw)
    expect(out[0]?.competitorCoverageGap).toContain('no top-10')
  })

  it('returns [] on empty input', () => {
    expect(parseResearchResponse('')).toEqual([])
    expect(parseResearchResponse('   ')).toEqual([])
  })

  it('returns [] on unparseable JSON', () => {
    expect(parseResearchResponse('this is just prose, not JSON')).toEqual([])
  })

  it('returns [] when the top-level shape is wrong', () => {
    expect(parseResearchResponse(JSON.stringify({ foo: 'bar' }))).toEqual([])
  })
})
