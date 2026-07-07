import type { MetadataRoute } from 'next'

// `.replace(/[\s/]+$/, '')` — strip both trailing slashes AND whitespace.
// The Vercel env we inherited from the old app has a literal newline at
// the end of `NEXT_PUBLIC_MARKETING_URL`; without this strip the sitemap
// emits `https://superaccountant.in\n/en` and Google silently drops most
// entries (GSC was showing 5 of 12).
const SITE_URL = (
  process.env.NEXT_PUBLIC_MARKETING_URL ?? 'https://www.superaccountant.in'
).replace(/[\s/]+$/, '')

const ROUTES: { path: string; priority: number; changeFrequency: 'weekly' | 'monthly' }[] = [
  { path: '', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/features', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'monthly' },
]

const LOCALES = ['en', 'ar'] as const

/**
 * Marketing sitemap. Emits one entry per (locale × route) pair, with hreflang
 * alternates so search engines understand the bilingual structure.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return LOCALES.flatMap((locale) =>
    ROUTES.map(({ path, priority, changeFrequency }) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
      alternates: {
        languages: {
          en: `${SITE_URL}/en${path}`,
          ar: `${SITE_URL}/ar${path}`,
        },
      },
    })),
  )
}
