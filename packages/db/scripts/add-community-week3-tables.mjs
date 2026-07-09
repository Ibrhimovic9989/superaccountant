// One-shot: Week 3 community tables.
//
//   CommunityNotification  — one row per event a user should see:
//                            like on your post, comment on your post,
//                            new follower, milestone reply, etc.
//                            Denormalises the actor + subject so the
//                            bell can render without joining back to
//                            IdentityUser on every load.
//
//   RecruiterAccess        — one row per approved recruiter. Kept as
//                            a separate table (not a new value on
//                            UserRole) because the enum migration is
//                            heavier than a new table, and this
//                            preserves audit history — who approved,
//                            when, with what notes.
//
// Both are raw-SQL tables outside schema.prisma, matching the pattern
// established by the blog + community-week1 migrations.
//
// Run:  cd packages/db && node scripts/add-community-week3-tables.mjs

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

// ── CommunityNotification ────────────────────────────────────
// `type` values:
//   like            — actor liked recipient's post (subject = postId)
//   comment         — actor commented on recipient's post
//   follow          — actor followed recipient (subject = null)
//   milestone-post  — recipient's own auto-milestone landed (subject = postId)
//                     Useful because otherwise the notification bell
//                     stays silent even when big things happen.
await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "CommunityNotification" (
    "id" TEXT PRIMARY KEY,
    "recipientId" TEXT NOT NULL,
    "type" TEXT NOT NULL
      CHECK ("type" IN ('like', 'comment', 'follow', 'milestone-post', 'mention')),
    "actorId" TEXT,
    -- Snippet is a short human-readable description so the bell can
    -- render 'You + 3 others liked "GST rate change …"' style copy
    -- without joining back to the post/comment.
    "snippet" TEXT,
    "subjectType" TEXT
      CHECK ("subjectType" IS NULL OR "subjectType" IN ('post', 'comment', 'profile')),
    "subjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "readAt" TIMESTAMP(3)
  )
`)
await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "CommunityNotification_recipient_createdAt_idx"
    ON "CommunityNotification" ("recipientId", "createdAt" DESC)
`)
// Fast unread count query — very hot on every page load with the bell.
await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "CommunityNotification_unread_idx"
    ON "CommunityNotification" ("recipientId")
    WHERE "readAt" IS NULL
`)
// Idempotency: a single (recipient, type, actor, subject) tuple should
// only produce one notification even if the underlying action is
// retried (e.g. unlike + re-like in quick succession). Partial UNIQUE
// so old records don't block new notifications from the same actor.
await p.$executeRawUnsafe(`
  CREATE UNIQUE INDEX IF NOT EXISTS "CommunityNotification_dedupe_idx"
    ON "CommunityNotification" ("recipientId", "type", "actorId", "subjectId")
    WHERE "actorId" IS NOT NULL AND "subjectId" IS NOT NULL
`)

// ── RecruiterAccess ──────────────────────────────────────────
await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "RecruiterAccess" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT UNIQUE NOT NULL,
    -- Org / company name so directory viewers can tell which recruiter
    -- is looking at whose profile in the reviews table later.
    "companyName" TEXT,
    "companyDomain" TEXT,
    -- When set, they've been approved and can access /recruiters.
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    -- When set, they were explicitly rejected — different from "not yet
    -- reviewed". The notes column records the reason for either.
    "rejectedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
  )
`)
await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "RecruiterAccess_approvedAt_idx"
    ON "RecruiterAccess" ("approvedAt" DESC)
    WHERE "approvedAt" IS NOT NULL
`)

console.log('[add-community-week3-tables] notification + recruiter tables ready')
await p.$disconnect()
