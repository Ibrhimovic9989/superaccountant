import { describe, expect, it } from 'vitest'
import { isPubliclyVisible, matchesStatusFilter, VISIBLE_POSTS_WHERE_SQL } from './filter'
import type { BlogPost } from './types'

/**
 * The public reading surface relies on isPubliclyVisible to keep drafts
 * + scheduled posts + soft-deleted rows out of SERPs. These tests pin
 * down every rule the SQL filter in store.ts also has to honour.
 */

function post(overrides: Partial<BlogPost>): Pick<BlogPost, 'status' | 'publishedAt' | 'deletedAt'> {
  return {
    status: 'published',
    publishedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  }
}

describe('isPubliclyVisible', () => {
  const now = new Date('2026-06-01T12:00:00Z')

  it('shows a published post with a past publishedAt', () => {
    expect(isPubliclyVisible(post({}), now)).toBe(true)
  })

  it('hides drafts', () => {
    expect(isPubliclyVisible(post({ status: 'draft' }), now)).toBe(false)
  })

  it('hides scheduled posts even if scheduledFor is in the past', () => {
    expect(isPubliclyVisible(post({ status: 'scheduled' }), now)).toBe(false)
  })

  it('hides archived posts', () => {
    expect(isPubliclyVisible(post({ status: 'archived' }), now)).toBe(false)
  })

  it('hides soft-deleted posts even if status=published', () => {
    expect(
      isPubliclyVisible(post({ deletedAt: new Date('2026-05-01T00:00:00Z') }), now),
    ).toBe(false)
  })

  it('hides a published post whose publishedAt is still in the future', () => {
    expect(
      isPubliclyVisible(post({ publishedAt: new Date('2026-12-31T00:00:00Z') }), now),
    ).toBe(false)
  })

  it('hides a published post with null publishedAt (data weirdness)', () => {
    expect(isPubliclyVisible(post({ publishedAt: null }), now)).toBe(false)
  })

  it('shows a published post whose publishedAt is exactly now', () => {
    expect(isPubliclyVisible(post({ publishedAt: now }), now)).toBe(true)
  })
})

describe('matchesStatusFilter', () => {
  it('drops soft-deleted rows regardless of filter', () => {
    const p = { status: 'published' as const, deletedAt: new Date() }
    expect(matchesStatusFilter(p, 'all')).toBe(false)
    expect(matchesStatusFilter(p, 'published')).toBe(false)
  })

  it("'all' includes every non-deleted status", () => {
    for (const status of ['draft', 'scheduled', 'published', 'archived'] as const) {
      expect(matchesStatusFilter({ status, deletedAt: null }, 'all')).toBe(true)
    }
  })

  it('exact-status filter matches only that status', () => {
    expect(matchesStatusFilter({ status: 'draft', deletedAt: null }, 'draft')).toBe(true)
    expect(matchesStatusFilter({ status: 'published', deletedAt: null }, 'draft')).toBe(false)
  })
})

describe('VISIBLE_POSTS_WHERE_SQL', () => {
  it('mentions every column isPubliclyVisible looks at', () => {
    // Cheap drift detection: if someone edits one without the other we
    // catch it in CI.
    expect(VISIBLE_POSTS_WHERE_SQL).toContain('"status" = \'published\'')
    expect(VISIBLE_POSTS_WHERE_SQL).toContain('"deletedAt" IS NULL')
    expect(VISIBLE_POSTS_WHERE_SQL).toContain('"publishedAt" IS NOT NULL')
    expect(VISIBLE_POSTS_WHERE_SQL).toContain('"publishedAt" <= NOW()')
  })
})
