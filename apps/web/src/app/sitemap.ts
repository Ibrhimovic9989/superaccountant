import { prisma } from '@sa/db'
import { LOCALES } from '@sa/i18n'
import type { MetadataRoute } from 'next'

/**
 * XML sitemap for app.superaccountant.in. Only public, indexable pages
 * go here — gated routes (dashboard, lessons, admin, profile, etc.)
 * are excluded both here and via robots.ts.
 *
 * Locale-aware: every public route gets one entry per locale, with an
 * `alternates.languages` block so Google can resolve the EN ↔ AR pair.
 * Dynamic job postings are pulled from Prisma. We deliberately skip
 * certificate verify URLs (no SEO value, too many) and the lesson
 * catalogue (gated).
 */

const SITE_URL = (process.env.NEXTAUTH_URL ?? 'https://app.superaccountant.in').replace(/\/$/, '')

type StaticEntry = {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}

// Public marketing + product pages. /[locale] root redirects to
// /dashboard so we leave it out — only "real" public surfaces ship.
const STATIC_PUBLIC: StaticEntry[] = [
  { path: '/cohort', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/jobs', changeFrequency: 'daily', priority: 0.9 },
  { path: '/quiz', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/rewards', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/refund-policy', changeFrequency: 'yearly', priority: 0.2 },
]

function buildAlternates(path: string): Record<string, string> {
  const langs: Record<string, string> = {}
  for (const l of LOCALES) langs[l] = `${SITE_URL}/${l}${path}`
  // x-default points at English for Google's locale-fallback logic.
  langs['x-default'] = `${SITE_URL}/en${path}`
  return langs
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_PUBLIC.flatMap((e) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}/${locale}${e.path}`,
      lastModified: now,
      changeFrequency: e.changeFrequency,
      priority: e.priority,
      alternates: { languages: buildAlternates(e.path) },
    })),
  )

  // Dynamic: open job postings from approved companies. One URL per
  // job per locale. We cap at 5000 to keep the sitemap < 50k entries
  // even if the board grows fast — sitemap index can be split later.
  let jobs: Array<{ id: string; updatedAt: Date }> = []
  try {
    jobs = await prisma.$queryRaw<Array<{ id: string; updatedAt: Date }>>`
      SELECT j."id", j."updatedAt"
      FROM "Job" j
      JOIN "Company" c ON c."id" = j."companyId"
      WHERE j."status" = 'open' AND c."status" = 'approved'
      ORDER BY j."publishedAt" DESC
      LIMIT 5000
    `
  } catch (err) {
    // Soft-fail — sitemap should still render with static entries even
    // if the DB is unavailable at build / request time. We log to the
    // server console so a missing Job table doesn't break SEO.
    console.error('[sitemap] failed to load jobs', err)
  }

  const jobEntries: MetadataRoute.Sitemap = jobs.flatMap((job) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}/${locale}/jobs/${job.id}`,
      lastModified: job.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      alternates: { languages: buildAlternates(`/jobs/${job.id}`) },
    })),
  )

  return [...staticEntries, ...jobEntries]
}
