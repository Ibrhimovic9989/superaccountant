import 'server-only'
import type { PublishedPostRow } from './db'
import type { GscPagePerf } from './gsc'
import type { Ga4HostPageRow } from './ga4'
import { type IndexBucket, type UrlIndexStatus, bucketFromStatus } from './gsc-inspect'

/**
 * Joins BlogPost rows to their GA4 traffic (per blog URL) and their
 * GSC search performance (per blog URL). One structure fed to the UI
 * so the panel just renders — no per-row lookups on the client.
 *
 * Match strategy: exact match on pagePath, canonicalised so a trailing
 * slash doesn't fool it. GA4 and GSC use different URL conventions
 * (GA4 = path, GSC = full URL) so both are normalised into a bare
 * path before comparison.
 */

export type BlogPerfRow = {
  post: PublishedPostRow
  blogUrl: string
  ga4: {
    views: number
    activeUsers: number
    eventCount: number
  }
  gsc: {
    impressions: number
    clicks: number
    ctr: number
    position: number
    topQueries: Array<{
      query: string
      impressions: number
      clicks: number
      position: number
    }>
  }
  indexation: {
    bucket: IndexBucket
    coverageState: string
    lastCrawlTime: string | null
  }
}

const BLOG_HOST = 'blog.superaccountant.in'

function canonicalisePath(u: string): string {
  if (!u) return ''
  // Drop protocol + hostname, then any query/hash, then trailing slash.
  const noHost = u.replace(/^https?:\/\/[^/]+/, '')
  const noQuery = noHost.split(/[?#]/)[0] ?? noHost
  return noQuery.replace(/\/+$/, '') || '/'
}

export function joinBlogPerformance(args: {
  posts: PublishedPostRow[]
  ga4Rows: Ga4HostPageRow[]
  gscRows: GscPagePerf[]
  /**
   * Optional — URL Inspection results keyed by full blog URL. When
   * absent (e.g. inspection call skipped) every row falls back to
   * `unknown`, which the chip renders as a muted grey badge.
   */
  indexStatuses?: Map<string, UrlIndexStatus>
}): BlogPerfRow[] {
  const ga4ByPath = new Map<string, Ga4HostPageRow>()
  for (const r of args.ga4Rows) ga4ByPath.set(canonicalisePath(r.pagePath), r)

  const gscByPath = new Map<string, GscPagePerf>()
  for (const r of args.gscRows) gscByPath.set(canonicalisePath(r.page), r)

  return args.posts.map((post) => {
    const path = canonicalisePath(`/${post.slug}`)
    const blogUrl = `https://${BLOG_HOST}/${post.slug}`
    const ga = ga4ByPath.get(path)
    const gsc = gscByPath.get(path)
    const indexStatus = args.indexStatuses?.get(blogUrl)
    return {
      post,
      blogUrl,
      ga4: {
        views: ga?.views ?? 0,
        activeUsers: ga?.activeUsers ?? 0,
        eventCount: ga?.eventCount ?? 0,
      },
      gsc: {
        impressions: gsc?.impressions ?? 0,
        clicks: gsc?.clicks ?? 0,
        ctr: gsc?.ctr ?? 0,
        position: gsc?.position ?? 0,
        topQueries: gsc?.topQueries ?? [],
      },
      indexation: {
        bucket: bucketFromStatus(indexStatus),
        coverageState: indexStatus?.coverageState ?? 'Unknown',
        lastCrawlTime: indexStatus?.lastCrawlTime ?? null,
      },
    }
  })
}
