import { NextResponse } from 'next/server'
import { prisma } from '@sa/db'

/**
 * Public JSON manifest of the top-N recently published posts, consumed
 * by the marketing homepage's "From the Journal" strip so that page
 * carries live, contextual internal links to the blog subdomain.
 *
 * Why this exists (2026-07-14): Google Search Console reported
 * "URL is unknown to Google" for every one of the 57 blog URLs. The
 * blog sitemap was submitted but Googlebot never fetched it because
 * the domain had no discovered pages to build authority from. This
 * endpoint feeds the marketing homepage a fresh list of blog URLs so
 * the highest-authority page on the site permanently links to them —
 * which is the fastest way to get Google to actually crawl the blog.
 *
 * Cached at the edge for 10 minutes (revalidate = 600). Fresh enough
 * that a new post ships to the homepage in ~10 min without hammering
 * Postgres.
 */
export const revalidate = 600

type FeaturedRow = {
  slug: string
  titleEn: string
  metaDescriptionEn: string
  heroImageUrl: string | null
  market: 'india' | 'ksa' | 'global'
  publishedAt: Date
}

export async function GET() {
  const rows = await prisma.$queryRawUnsafe<FeaturedRow[]>(
    `SELECT "slug", "titleEn", "metaDescriptionEn", "heroImageUrl",
            "market", "publishedAt"
     FROM "BlogPost"
     WHERE "status" = 'published' AND "deletedAt" IS NULL
     ORDER BY "publishedAt" DESC
     LIMIT 6`,
  )
  return NextResponse.json({
    posts: rows.map((r) => ({
      slug: r.slug,
      title: r.titleEn,
      description: r.metaDescriptionEn,
      heroImageUrl: r.heroImageUrl,
      market: r.market,
      publishedAt: r.publishedAt.toISOString(),
    })),
  })
}
