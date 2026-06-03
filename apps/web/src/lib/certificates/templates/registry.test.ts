import { describe, expect, it } from 'vitest'
import { ALL_TEMPLATES, DEFAULT_TEMPLATE_ID, TEMPLATE_REGISTRY, resolveTemplate } from './index'
import type { TemplateId } from './types'

/**
 * Registry invariants. These guarantee the OCP property of the
 * certificate-template catalogue: every id resolves to a component,
 * components share the same prop shape, and unknown ids fall back
 * defensively instead of throwing.
 */

const EXPECTED_IDS: TemplateId[] = [
  'classic-navy',
  'ornate-cream',
  'tech-cert-aws',
  'tech-cert-azure',
  'tech-cert-gcp',
]

describe('certificate template registry', () => {
  it('exposes the five expected template ids with no duplicates', () => {
    const keys = Object.keys(TEMPLATE_REGISTRY)
    expect(new Set(keys).size).toBe(keys.length) // no duplicates
    expect(new Set(keys)).toEqual(new Set(EXPECTED_IDS))
  })

  it('each registry entry has id, name, description and a Component', () => {
    for (const id of EXPECTED_IDS) {
      const entry = TEMPLATE_REGISTRY[id]
      expect(entry.id).toBe(id)
      expect(typeof entry.name).toBe('string')
      expect(entry.name.length).toBeGreaterThan(0)
      expect(typeof entry.description).toBe('string')
      expect(entry.description.length).toBeGreaterThan(0)
      expect(typeof entry.Component).toBe('function')
    }
  })

  it('ALL_TEMPLATES mirrors the registry exactly once each', () => {
    expect(ALL_TEMPLATES).toHaveLength(EXPECTED_IDS.length)
    const seen = new Set<string>()
    for (const t of ALL_TEMPLATES) {
      expect(seen.has(t.id)).toBe(false)
      seen.add(t.id)
    }
  })

  it('the default template id resolves to classic-navy', () => {
    expect(DEFAULT_TEMPLATE_ID).toBe('classic-navy')
    expect(resolveTemplate(undefined).id).toBe('classic-navy')
    expect(resolveTemplate(null).id).toBe('classic-navy')
  })

  it('falls back to classic-navy for unknown ids', () => {
    expect(resolveTemplate('not-a-real-template').id).toBe('classic-navy')
    expect(resolveTemplate('').id).toBe('classic-navy')
  })

  it('resolves each known id to its own entry', () => {
    for (const id of EXPECTED_IDS) {
      expect(resolveTemplate(id).id).toBe(id)
    }
  })

  it('every Component is a unary function (props arg)', () => {
    // Components are TemplateComponent — fn({ template, data }) => ReactElement.
    // We can't render @react-pdf trees in jsdom (Page/Document aren't real DOM)
    // but we can assert each Component has arity 1 (the props object).
    for (const t of ALL_TEMPLATES) {
      expect(t.Component.length).toBe(1)
    }
  })

  it('only recommends ornate-cream by default', () => {
    // Soft check — easy to change later, documents the current intent.
    const recommended = ALL_TEMPLATES.filter((t) => t.recommended)
    expect(recommended.map((t) => t.id)).toEqual(['ornate-cream'])
  })
})
