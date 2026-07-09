import 'server-only'
import { randomUUID } from 'node:crypto'
import { prisma } from '@sa/db'
import type { ProfileTone } from './types'

/**
 * Recruiter access + graduate directory reads.
 *
 * Approval flow:
 *   1. Recruiter signs in like a regular user.
 *   2. Somewhere on the app (or via the sign-up form later) they
 *      request access → we insert a RecruiterAccess row with no
 *      approvedAt.
 *   3. Admin reviews + calls approveRecruiterAccess() to set
 *      approvedAt + approvedBy. Now the /recruiters route lets them in.
 *
 * Directory read joins profile + achievements so a recruiter can
 * filter by market + mastery + cohort-complete in one query. The row
 * itself is small (no post bodies, no comment threads) so a page can
 * render up to ~50 candidates without pagination.
 */

// ── Access ────────────────────────────────────────────────────

export async function isApprovedRecruiter(userId: string | null): Promise<boolean> {
  if (!userId) return false
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "RecruiterAccess"
      WHERE "userId" = $1 AND "approvedAt" IS NOT NULL
      LIMIT 1`,
    userId,
  )
  return rows.length > 0
}

export async function isAdmin(userId: string | null): Promise<boolean> {
  if (!userId) return false
  const rows = await prisma.$queryRawUnsafe<{ role: string }[]>(
    `SELECT role::text AS role FROM "IdentityUser" WHERE id = $1 LIMIT 1`,
    userId,
  )
  return rows[0]?.role === 'admin'
}

export async function requestRecruiterAccess(args: {
  userId: string
  companyName: string
  companyDomain: string
  notes?: string
}): Promise<void> {
  const id = `ra_${randomUUID().replace(/-/g, '').slice(0, 20)}`
  await prisma.$executeRawUnsafe(
    `INSERT INTO "RecruiterAccess"
       ("id", "userId", "companyName", "companyDomain", "notes")
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT ("userId") DO UPDATE
        SET "companyName" = EXCLUDED."companyName",
            "companyDomain" = EXCLUDED."companyDomain",
            "notes" = COALESCE(EXCLUDED."notes", "RecruiterAccess"."notes"),
            "updatedAt" = NOW()`,
    id,
    args.userId,
    args.companyName,
    args.companyDomain,
    args.notes ?? null,
  )
}

export async function approveRecruiterAccess(args: {
  userId: string
  approvedBy: string
  notes?: string
}): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "RecruiterAccess"
        SET "approvedAt" = NOW(),
            "approvedBy" = $2,
            "notes" = COALESCE($3, "notes"),
            "rejectedAt" = NULL,
            "updatedAt" = NOW()
      WHERE "userId" = $1`,
    args.userId,
    args.approvedBy,
    args.notes ?? null,
  )
}

// ── Directory ────────────────────────────────────────────────

export type DirectoryFilters = {
  market?: 'india' | 'ksa' | null
  minMastery?: number | null
  passedGrandTest?: boolean | null
  cohortCompleted?: boolean | null
}

export type DirectoryCandidate = {
  userId: string
  handle: string
  name: string | null
  headline: string | null
  tone: ProfileTone
  avatarUrl: string | null
  bio: string | null
  followerCount: number
  postCount: number
  market: 'india' | 'ksa' | null
  /** 0..1 — top grand-test score across all attempts. */
  bestGrandTestScore: number | null
  passedGrandTest: boolean
  cohortCompleted: boolean
  hasCertificate: boolean
  latestActivityAt: string | null
}

export async function listGraduates(
  filters: DirectoryFilters,
  limit = 50,
): Promise<DirectoryCandidate[]> {
  // One denormalising query — LEFT JOINs to per-user aggregates.
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      userId: string
      handle: string
      name: string | null
      avatarUrl: string | null
      bio: string | null
      tone: ProfileTone
      followerCount: number
      postCount: number
      market: 'india' | 'ksa' | null
      bestGrandTestScore: number | null
      passedGrandTest: boolean
      cohortCompleted: boolean
      hasCertificate: boolean
      latestActivityAt: Date | null
    }>
  >(
    `SELECT
       iu.id AS "userId",
       cp.handle AS "handle",
       iu.name AS "name",
       iu.image AS "avatarUrl",
       cp.bio,
       cp.tone,
       cp."followerCount",
       cp."postCount",
       iu."preferredTrack"::text AS "market",
       (SELECT MAX(score) FROM "AssessmentAttempt"
         WHERE "userId" = iu.id AND kind = 'grand' AND status = 'graded') AS "bestGrandTestScore",
       EXISTS (SELECT 1 FROM "AssessmentAttempt"
                WHERE "userId" = iu.id AND kind = 'grand' AND status = 'graded'
                  AND COALESCE(score, 0) >= 0.6) AS "passedGrandTest",
       EXISTS (SELECT 1 FROM "LearningEnrollment"
                WHERE "userId" = iu.id AND "completedAt" IS NOT NULL) AS "cohortCompleted",
       EXISTS (SELECT 1 FROM "CertificationCertificate"
                WHERE "userId" = iu.id) AS "hasCertificate",
       (SELECT MAX("publishedAt") FROM "CommunityPost"
         WHERE "authorId" = iu.id AND "deletedAt" IS NULL) AS "latestActivityAt"
     FROM "IdentityUser" iu
     JOIN "CommunityProfile" cp ON cp."userId" = iu.id
     WHERE cp."publicVisibility" = 'public'
       AND ($1::text IS NULL OR iu."preferredTrack"::text = $1::text)
       AND (
         $2::float IS NULL
         OR (SELECT MAX(score) FROM "AssessmentAttempt"
              WHERE "userId" = iu.id AND kind = 'grand' AND status = 'graded') >= $2::float
       )
       AND (
         $3::boolean IS NULL
         OR EXISTS (SELECT 1 FROM "AssessmentAttempt"
                     WHERE "userId" = iu.id AND kind = 'grand' AND status = 'graded'
                       AND COALESCE(score, 0) >= 0.6) = $3::boolean
       )
       AND (
         $4::boolean IS NULL
         OR EXISTS (SELECT 1 FROM "LearningEnrollment"
                     WHERE "userId" = iu.id AND "completedAt" IS NOT NULL) = $4::boolean
       )
     ORDER BY
       (SELECT MAX(score) FROM "AssessmentAttempt"
         WHERE "userId" = iu.id AND kind = 'grand' AND status = 'graded') DESC NULLS LAST,
       cp."postCount" DESC
     LIMIT $5`,
    filters.market ?? null,
    filters.minMastery ?? null,
    filters.passedGrandTest ?? null,
    filters.cohortCompleted ?? null,
    limit,
  )

  return rows.map((r) => ({
    userId: r.userId,
    handle: r.handle,
    name: r.name,
    tone: r.tone,
    avatarUrl: r.avatarUrl,
    bio: r.bio,
    followerCount: r.followerCount,
    postCount: r.postCount,
    market: r.market,
    bestGrandTestScore: r.bestGrandTestScore != null ? Number(r.bestGrandTestScore) : null,
    passedGrandTest: r.passedGrandTest,
    cohortCompleted: r.cohortCompleted,
    hasCertificate: r.hasCertificate,
    latestActivityAt: r.latestActivityAt?.toISOString() ?? null,
    headline:
      r.market === 'india'
        ? 'India · Chartered Path'
        : r.market === 'ksa'
          ? "KSA · Mu'tamad Path"
          : null,
  }))
}
