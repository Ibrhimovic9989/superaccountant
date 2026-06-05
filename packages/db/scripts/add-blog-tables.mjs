// One-shot: create the content-marketing blog schema.
//
//   BlogPost                   — bilingual article record, status machine
//                                draft → scheduled → published → archived
//   BlogTopic                  — research queue feeding the writer agent
//   BlogPostAnalyticsSnapshot  — periodic GA4 (or other) traffic capture
//                                so we can chart trends without hitting
//                                GA's API on every dashboard load
//
// Mirrors the raw-SQL convention used by add-careers-tables.mjs and
// add-cohort-tables.mjs — no Prisma migrate, no schema.prisma edits.
// Reads will use prisma.$queryRaw from apps/blog/src/lib/blog/store.ts.
//
// Run locally:  cd packages/db && node scripts/add-blog-tables.mjs

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
const { PrismaClient } = await import('@prisma/client')
const p = new PrismaClient()

// ── BlogPost ─────────────────────────────────────────────────
// Bilingual columns (EN required, AR optional) so a post can launch in
// English first and have the Arabic translation written later. Status
// machine matches the editorial flow:
//   draft       → in progress, not visible
//   scheduled   → set publishedAt in the future, cron flips to published
//   published   → publicly indexable
//   archived    → unpublished, kept for audit + reversibility
//
// targetKeywords[] is GIN-indexed so /tag/[keyword] queries are fast
// even when the corpus grows past a thousand posts. Conversion counters
// are denormalised onto the row so the admin overview doesn't have to
// roll up analytics on every page load.
await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "BlogPost" (
    "id" TEXT PRIMARY KEY,
    "slug" TEXT UNIQUE NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT,
    "subtitleEn" TEXT,
    "subtitleAr" TEXT,
    "contentEnMdx" TEXT NOT NULL,
    "contentArMdx" TEXT,
    "metaDescriptionEn" TEXT NOT NULL,
    "metaDescriptionAr" TEXT,
    "heroImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft'
      CHECK ("status" IN ('draft', 'scheduled', 'published', 'archived')),
    "publishedAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "authorAgentId" TEXT,
    "authorHumanUserId" TEXT REFERENCES "IdentityUser"("id") ON DELETE SET NULL,
    "targetKeywords" TEXT[] NOT NULL DEFAULT '{}',
    "market" TEXT NOT NULL DEFAULT 'global'
      CHECK ("market" IN ('india', 'ksa', 'global')),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "signupConversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMP(3)
  )
`)
await p.$executeRawUnsafe(
  `CREATE INDEX IF NOT EXISTS "BlogPost_status_publishedAt_idx"
   ON "BlogPost" ("status", "publishedAt" DESC)`,
)
await p.$executeRawUnsafe(
  `CREATE INDEX IF NOT EXISTS "BlogPost_market_status_publishedAt_idx"
   ON "BlogPost" ("market", "status", "publishedAt" DESC)`,
)
await p.$executeRawUnsafe(
  `CREATE INDEX IF NOT EXISTS "BlogPost_targetKeywords_idx"
   ON "BlogPost" USING GIN ("targetKeywords")`,
)
console.log('✓ BlogPost table + indexes')

// ── BlogTopic ────────────────────────────────────────────────
// Research queue. The sibling SEO/GEO writer agent in
// apps/api/src/contexts/content-marketing/ writes rows here from
// keyword-research runs; admins can promote 'researched' → 'queued'
// and then the writer pulls 'queued' ones to draft. On successful
// publish the row flips to 'used' and links back to the BlogPost.
await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "BlogTopic" (
    "id" TEXT PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "sourceKeywords" TEXT[] NOT NULL DEFAULT '{}',
    "marketResearch" JSONB,
    "status" TEXT NOT NULL DEFAULT 'researched'
      CHECK ("status" IN ('researched', 'queued', 'used', 'archived')),
    "targetMarket" TEXT NOT NULL DEFAULT 'global'
      CHECK ("targetMarket" IN ('india', 'ksa', 'global')),
    "targetAudience" TEXT NOT NULL DEFAULT 'students'
      CHECK ("targetAudience" IN ('students', 'graduates', 'accountants')),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "usedAt" TIMESTAMP(3),
    "usedByBlogPostId" TEXT REFERENCES "BlogPost"("id") ON DELETE SET NULL
  )
`)
await p.$executeRawUnsafe(
  `CREATE INDEX IF NOT EXISTS "BlogTopic_status_generatedAt_idx"
   ON "BlogTopic" ("status", "generatedAt" DESC)`,
)
console.log('✓ BlogTopic table + index')

// ── BlogPostAnalyticsSnapshot ────────────────────────────────
// Periodic snapshot of traffic + engagement per post. Source defaults
// to 'ga4' but stays a free-text column so we can pull from Search
// Console / Plausible / direct edge logs in the future without a
// schema migration.
//
// Snapshots are append-only — never UPDATE a row, always INSERT a new
// one. That gives us a time series for charting and keeps the analytics
// pipeline idempotent.
await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "BlogPostAnalyticsSnapshot" (
    "id" TEXT PRIMARY KEY,
    "blogPostId" TEXT NOT NULL REFERENCES "BlogPost"("id") ON DELETE CASCADE,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "pageviews" INTEGER NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "bounceRate" REAL,
    "avgEngagementTimeSec" REAL,
    "signupsAttributed" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'ga4'
  )
`)
await p.$executeRawUnsafe(
  `CREATE INDEX IF NOT EXISTS "BlogPostAnalyticsSnapshot_post_time_idx"
   ON "BlogPostAnalyticsSnapshot" ("blogPostId", "snapshotAt" DESC)`,
)
console.log('✓ BlogPostAnalyticsSnapshot table + index')

await p.$disconnect()
console.log('\nBlog tables ready.')
