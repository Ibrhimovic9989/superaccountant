import type { MetadataRoute } from 'next'

// Strip trailing whitespace too — see comment in sitemap.ts.
const SITE_URL = (
  process.env.NEXT_PUBLIC_MARKETING_URL ?? 'https://www.superaccountant.in'
).replace(/[\s/]+$/, '')

const BLOG_URL = (
  process.env.NEXT_PUBLIC_BLOG_URL ?? 'https://blog.superaccountant.in'
).replace(/[\s/]+$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Generated OG images and the next internals don't need to be indexed.
        disallow: ['/api/', '/_next/', '/opengraph-image', '/icon', '/apple-icon'],
      },
    ],
    // Announce both sitemaps here so a crawler that hits the marketing
    // robots.txt learns about the blog subdomain too. Google still wants
    // each verified in its own GSC property, but this covers Bing / others.
    sitemap: [`${SITE_URL}/sitemap.xml`, `${BLOG_URL}/sitemap.xml`],
    host: SITE_URL,
  }
}
