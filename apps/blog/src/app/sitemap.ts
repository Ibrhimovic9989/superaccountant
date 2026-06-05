import type { MetadataRoute } from 'next'
import { listAllPublishedSlugs } from '@/lib/blog/store'

const SITE_URL = (
  process.env.NEXT_PUBLIC_BLOG_URL ?? 'https://blog.superaccountant.in'
).replace(/\/$/, '')

/**
 * Blog sitemap. Includes:
 *   - home
 *   - every published post (lastModified = updatedAt)
 *
 * Tag pages are intentionally excluded — they're derivable from post
 * keywords and Google indexes them via internal links from posts +
 * tag pages themselves.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await listAllPublishedSlugs()
  const now = new Date()

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...slugs.map((s) => ({
      url: `${SITE_URL}/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
