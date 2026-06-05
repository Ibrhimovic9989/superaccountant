/**
 * Pure predicates for the published-vs-not-published decision.
 *
 * Split out from store.ts so unit tests don't have to spin up Prisma.
 * The same rules are encoded in SQL `WHERE` clauses in store.ts; this
 * module is the canonical specification and the tests in
 * filter.test.ts pin it down.
 */

import type { BlogPost, BlogPostStatus } from './types'

/**
 * True iff this post should be visible on the public surface right now.
 *
 * Rules:
 *   1. Must be status='published'.
 *   2. Must NOT be soft-deleted.
 *   3. publishedAt must be in the past (or now). A scheduled-for-future
 *      row that was already flipped to 'published' (race, manual edit,
 *      timezone surprise) is still hidden until its publishedAt lands.
 *   4. The 'scheduled' status is never publicly visible — even if its
 *      scheduledFor is in the past, the cron flip hasn't happened yet,
 *      so editorial intent is "not live".
 *
 * The `now` argument is injectable so tests aren't flaky.
 */
export function isPubliclyVisible(
  post: Pick<BlogPost, 'status' | 'publishedAt' | 'deletedAt'>,
  now: Date = new Date(),
): boolean {
  if (post.deletedAt !== null) return false
  if (post.status !== 'published') return false
  if (post.publishedAt === null) return false
  return post.publishedAt.getTime() <= now.getTime()
}

/** SQL fragment counterpart, surfaced so tests can assert the shape
 *  stays in sync with isPubliclyVisible. Inline this exactly in the
 *  raw-SQL queries in store.ts. */
export const VISIBLE_POSTS_WHERE_SQL =
  `"status" = 'published' AND "deletedAt" IS NULL AND "publishedAt" IS NOT NULL AND "publishedAt" <= NOW()`

/** Admin listing — used by the admin table to filter by status. */
export function matchesStatusFilter(
  post: Pick<BlogPost, 'status' | 'deletedAt'>,
  filter: BlogPostStatus | 'all',
): boolean {
  // Soft-deleted rows never appear in admin lists; use the archive view
  // for those.
  if (post.deletedAt !== null) return false
  if (filter === 'all') return true
  return post.status === filter
}
