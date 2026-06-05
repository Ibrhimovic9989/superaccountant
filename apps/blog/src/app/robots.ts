import type { MetadataRoute } from 'next'

const SITE_URL = (
  process.env.NEXT_PUBLIC_BLOG_URL ?? 'https://blog.superaccountant.in'
).replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/sign-in', '/_next/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
