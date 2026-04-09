import type { MetadataRoute } from 'next'

const SITE_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, '') ??
  'https://www.superaccountant.in'

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
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
