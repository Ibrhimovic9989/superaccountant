// One-shot: add `relatedGuideSlugs` column to CurriculumLesson so each
// theoretical lesson can point at one or more practical software-guide
// pages (Tally / Zoho Books / QuickBooks). The lesson page then renders
// a "See this in practice" panel below LessonShell.
//
// Why an array of slugs (and not a join table):
//   - Guides are static TS data under apps/web/src/lib/data/guides/,
//     not a Prisma model. A join table to a non-existent table is
//     overkill.
//   - GIN index on the array gives fast "which lessons link to guide X?"
//     reverse lookups if we ever need them (e.g. recommend lessons from
//     a guide page).
//
// Run via:
//   cd packages/db && node scripts/add-related-guides.mjs
// then `pnpm --filter @sa/db generate` to refresh the Prisma client.

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
  ALTER TABLE "CurriculumLesson"
    ADD COLUMN IF NOT EXISTS "relatedGuideSlugs" TEXT[] NOT NULL DEFAULT '{}'
`)
console.log('✓ CurriculumLesson.relatedGuideSlugs column')

// GIN index for `relatedGuideSlugs @> ARRAY['some-slug']` reverse lookups.
await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "CurriculumLesson_related_guides_idx"
    ON "CurriculumLesson" USING GIN ("relatedGuideSlugs")
`)
console.log('✓ CurriculumLesson_related_guides_idx')

await p.$disconnect()
console.log('\nRelated-guides column ready. Run `pnpm --filter @sa/db generate` to refresh the Prisma client.')
