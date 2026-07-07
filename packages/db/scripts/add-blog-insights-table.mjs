// One-shot: create the BlogInsights snapshot table.
//
// Stores the daily rollup of "state of the blog" — top GA4 pages by
// sessions/engagement, top GSC queries by impressions/CTR/position,
// pages ranking on page 2 (positions 4–20) that are one-nudge away
// from breaking through. The SEO writer agent reads the most recent
// row before every generation so it can prioritise topics data-driven,
// not vibes-driven.
//
// One row per refresh. `refreshedAt` DESC is the "latest" query. Old
// rows stick around for trend charts later without a schema change.
// `market` is per-row so India-only and KSA-only rollups can coexist.
//
// Mirrors the raw-SQL convention used by add-blog-tables.mjs.
// Reads/writes will go through prisma.$queryRaw from
// apps/api/src/contexts/content-marketing/infrastructure/insights.repository.ts.
//
// Run locally:  cd packages/db && node scripts/add-blog-insights-table.mjs

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

await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "BlogInsights" (
    "id" TEXT PRIMARY KEY,
    -- Both markets share one snapshot for now; leave the column so we
    -- can split into 'india' | 'ksa' when the traffic mix warrants it.
    "market" TEXT NOT NULL DEFAULT 'all',
    -- Full JSON payload: {topPages, topQueries, breakoutCandidates,
    -- decliningPages, totals}. Storing as jsonb so we can query into
    -- individual rankings later without reshaping the table.
    "payload" JSONB NOT NULL,
    -- Days pulled — usually 28. Recorded so we know what "top" means.
    "windowDays" INTEGER NOT NULL DEFAULT 28,
    -- Cheap denormalised summaries for the admin overview page.
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalImpressions" INTEGER NOT NULL DEFAULT 0,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
  )
`)

await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "BlogInsights_market_refreshedAt_idx"
    ON "BlogInsights" ("market", "refreshedAt" DESC)
`)

console.log('[add-blog-insights-table] BlogInsights ready')
await p.$disconnect()
