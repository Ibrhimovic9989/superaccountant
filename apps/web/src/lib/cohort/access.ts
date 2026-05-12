import { prisma } from '@sa/db'

/**
 * Single source of truth for "does this user get full app access?"
 *
 * Three ways to qualify:
 *   1. role = 'staff' or 'admin'         — founders, ops, instructors
 *   2. ANY paid CohortApplication        — they enrolled and paid
 *   3. (Future) trial flag                — limited preview window
 *
 * Page-level guards / banner copy / nav visibility all branch off the
 * tier returned here so we never have inconsistent gating logic across
 * the app.
 */

export type AccessTier =
  | { kind: 'admin' | 'staff' } // unlimited, no banners
  | { kind: 'paid-cohort'; cohortId: string; cohortName: string } // paid student
  | { kind: 'preview' } // signed-in but no paid cohort

export async function getAccessTier(userId: string): Promise<AccessTier> {
  // Staff / admin: instant unlimited access
  const roleRows = await prisma.$queryRaw<{ role: string }[]>`
    SELECT "role" FROM "IdentityUser" WHERE "id" = ${userId} LIMIT 1
  `
  const role = roleRows[0]?.role ?? 'student'
  if (role === 'admin' || role === 'staff') {
    return { kind: role }
  }

  // Paid cohort application — join to grab the cohort name for the badge
  const paidRows = await prisma.$queryRaw<{ cohortId: string; cohortName: string }[]>`
    SELECT a."cohortId" AS "cohortId", c."name" AS "cohortName"
    FROM "CohortApplication" a
    JOIN "IdentityUser" u ON LOWER(u."email") = a."email"
    JOIN "Cohort" c ON c."id" = a."cohortId"
    WHERE u."id" = ${userId} AND a."status" = 'paid'
    ORDER BY a."paidAt" DESC NULLS LAST
    LIMIT 1
  `
  const paid = paidRows[0]
  if (paid) {
    return { kind: 'paid-cohort', cohortId: paid.cohortId, cohortName: paid.cohortName }
  }

  return { kind: 'preview' }
}

/** Convenience: true if the tier grants premium-feature access. */
export function hasFullAccess(tier: AccessTier): boolean {
  return tier.kind === 'admin' || tier.kind === 'staff' || tier.kind === 'paid-cohort'
}

/** Convenience: true only for admin users (admin-page guards). */
export function isAdmin(tier: AccessTier): boolean {
  return tier.kind === 'admin'
}
