// One-shot: for every existing IdentityUser, materialise a
// CommunityProfile row with an auto-generated handle. Idempotent —
// re-running is safe because the INSERT uses ON CONFLICT DO NOTHING.
//
// Also backfills auto:grand-test-pass posts for any historical
// AssessmentAttempt(kind='grand', status='graded', score>=0.6) so
// the community feed isn't empty on day one.
//
// Run:  cd packages/db && node scripts/backfill-community-profiles.mjs

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
const { PrismaClient } = await import('@prisma/client')
const p = new PrismaClient()

// Match the reserved-handle set in apps/web/src/lib/community/handle.ts.
const RESERVED = new Set([
  'admin','api','app','auth','blog','cohort','community','compose','dashboard',
  'docs','feed','grand-test','guides','insights','jobs','journal','lessons','me',
  'my-progress','notifications','p','pay','pricing','privacy','profile','quiz',
  'recruiters','roadmap','search','settings','sign-in','sign-out','sign-up',
  'students','superaccountant','terms','test','u','verify','welcome','you',
])

function normalise(seed) {
  const cleaned = String(seed || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/@.*$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
  return cleaned || 'student'
}

async function isTaken(candidate) {
  if (RESERVED.has(candidate.toLowerCase())) return true
  const rows = await p.$queryRawUnsafe(
    `SELECT id FROM "CommunityProfile" WHERE lower("handle") = lower($1) LIMIT 1`,
    candidate,
  )
  return rows.length > 0
}

async function pickHandle(seed) {
  const base = normalise(seed)
  const padded = base.length < 3 ? `${base}-student` : base
  if (!(await isTaken(padded))) return padded
  for (let n = 2; n < 1000; n++) {
    const trimmed = padded.slice(0, 24 - String(n).length - 1)
    const cand = `${trimmed}-${n}`
    if (!(await isTaken(cand))) return cand
  }
  return `${padded.slice(0, 16)}-${Math.random().toString(36).slice(2, 8)}`
}

// ── 1. Profiles ──────────────────────────────────────────────
const users = await p.$queryRawUnsafe(`
  SELECT iu.id, iu.name, iu.email
    FROM "IdentityUser" iu
    LEFT JOIN "CommunityProfile" cp ON cp."userId" = iu.id
   WHERE cp.id IS NULL
`)
console.log(`[backfill] ${users.length} users without a profile`)

let created = 0
for (const u of users) {
  const handle = await pickHandle(u.name || u.email)
  const id = `cp_${randomUUID().replace(/-/g, '').slice(0, 20)}`
  await p.$executeRawUnsafe(
    `INSERT INTO "CommunityProfile" ("id","userId","handle") VALUES ($1,$2,$3)
     ON CONFLICT ("userId") DO NOTHING`,
    id, u.id, handle,
  )
  created++
  if (created % 25 === 0) console.log(`  ${created}/${users.length}`)
}
console.log(`[backfill] profiles created: ${created}`)

// ── 2. Grand-test milestone posts (historical) ───────────────
const attempts = await p.$queryRawUnsafe(`
  SELECT
    a.id AS "attemptId",
    a."userId",
    a.score,
    a."gradedAt",
    (SELECT le."trackId" FROM "LearningEnrollment" le
      WHERE le."userId" = a."userId" ORDER BY le."enrolledAt" DESC LIMIT 1) AS "trackId"
  FROM "AssessmentAttempt" a
  WHERE a.kind = 'grand' AND a.status = 'graded' AND COALESCE(a.score, 0) >= 0.6
`)
console.log(`[backfill] ${attempts.length} historical grand-test passes to backfill`)

let postsCreated = 0
for (const at of attempts) {
  const pct = Math.round(Number(at.score) * 100)
  const trackLabel = at.trackId === 'ksa' ? "KSA Mu'tamad Path" : 'India Chartered Path'
  const body = `Just passed the SuperAccountant grand test — ${trackLabel} · ${pct}% mastery. Onwards.`
  const id = `p_${randomUUID().replace(/-/g, '').slice(0, 20)}`
  try {
    await p.$executeRawUnsafe(
      `INSERT INTO "CommunityPost"
         ("id","authorId","kind","body","tags","source",
          "linkedEntityType","linkedEntityId","publishedAt")
       VALUES ($1,$2,'milestone',$3,$4,'auto:grand-test-pass',
               'AssessmentAttempt',$5,COALESCE($6,NOW()))`,
      id, at.userId, body, ['grand-test', at.trackId ?? 'india'],
      at.attemptId, at.gradedAt,
    )
    await p.$executeRawUnsafe(
      `UPDATE "CommunityProfile" SET "postCount" = "postCount" + 1 WHERE "userId" = $1`,
      at.userId,
    )
    postsCreated++
  } catch (e) {
    // 23505 = the partial-UNIQUE index caught a repeat. Ignore.
    if (e && e.code !== '23505') throw e
  }
}
console.log(`[backfill] auto-milestone posts created: ${postsCreated}`)

await p.$disconnect()
console.log('[backfill] done')
