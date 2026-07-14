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

// Strip trailing whitespace AND slashes — same trailing-newline
// trap that broke the marketing sitemap and this app's robots.txt.
const SITE_URL = (process.env.NEXTAUTH_URL ?? 'https://app.superaccountant.in').replace(
  /[\s/]+$/,
  '',
)

type StaticEntry = {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}

// Public marketing + product pages. /[locale] root redirects to
// /dashboard so we leave it out — only "real" public surfaces ship.
//
// Community routes were added 2026-07-14 after GSC audit showed the
// app subdomain had zero pages discovered by Google — the community
// feed, reels, and public profiles are exactly the long-tail-SEO
// surfaces we want indexed.
const STATIC_PUBLIC: StaticEntry[] = [
  { path: '/cohort', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/jobs', changeFrequency: 'daily', priority: 0.9 },
  { path: '/community', changeFrequency: 'daily', priority: 0.9 },
  { path: '/reels', changeFrequency: 'daily', priority: 0.8 },
  { path: '/recruiters', changeFrequency: 'weekly', priority: 0.7 },
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

  // Community surfaces — public profiles, tag pages, and individual
  // posts. Same soft-fail pattern as jobs. Capped so a spam wave
  // can't blow up the sitemap.
  let profiles: Array<{ handle: string; updatedAt: Date }> = []
  let posts: Array<{ id: string; updatedAt: Date }> = []
  let tags: Array<{ tag: string }> = []
  try {
    profiles = await prisma.$queryRaw<Array<{ handle: string; updatedAt: Date }>>`
      SELECT "handle", "updatedAt" FROM "CommunityProfile"
      WHERE "publicVisibility" = 'public'
        AND "postCount" > 0
      ORDER BY "updatedAt" DESC
      LIMIT 5000
    `
    posts = await prisma.$queryRaw<Array<{ id: string; updatedAt: Date }>>`
      SELECT "id", "publishedAt" AS "updatedAt" FROM "CommunityPost"
      WHERE "deletedAt" IS NULL
      ORDER BY "publishedAt" DESC
      LIMIT 10000
    `
    // Distinct tags actually present on published posts — no dead
    // tag pages that Google would 404 on.
    tags = await prisma.$queryRaw<Array<{ tag: string }>>`
      SELECT DISTINCT unnest("tags") AS "tag" FROM "CommunityPost"
      WHERE "deletedAt" IS NULL
      LIMIT 2000
    `
  } catch (err) {
    console.error('[sitemap] failed to load community entries', err)
  }

  const profileEntries: MetadataRoute.Sitemap = profiles.flatMap((p) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}/${locale}/u/${p.handle}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
      alternates: { languages: buildAlternates(`/u/${p.handle}`) },
    })),
  )
  const postEntries: MetadataRoute.Sitemap = posts.flatMap((post) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}/${locale}/p/${post.id}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
      alternates: { languages: buildAlternates(`/p/${post.id}`) },
    })),
  )
  const tagEntries: MetadataRoute.Sitemap = tags.flatMap((t) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}/${locale}/tag/${encodeURIComponent(t.tag)}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
      alternates: {
        languages: buildAlternates(`/tag/${encodeURIComponent(t.tag)}`),
      },
    })),
  )

  return [
    ...staticEntries,
    ...jobEntries,
    ...profileEntries,
    ...postEntries,
    ...tagEntries,
  ]
}
