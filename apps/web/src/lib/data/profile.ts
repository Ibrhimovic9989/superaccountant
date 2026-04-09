import { prisma } from '@sa/db'

/**
 * Profile read/write helpers backed by raw SQL.
 *
 * The IdentityUser table has 11 profile columns added via
 * scripts/add-profile-fields.mjs that aren't yet in the generated Prisma
 * client. Until the client is regenerated, we read them with $queryRaw
 * and write them with $executeRaw — both are typesafe against PG and
 * fully parameterized.
 */

export type ProfileFields = {
  name: string | null
  phone: string | null
  country: string | null
  city: string | null
  currentRole: string | null
  currentEmployer: string | null
  experienceYears: number | null
  examGoal: string | null
  studyHoursPerWeek: number | null
  targetExamDate: Date | null
  motivation: string | null
}

export type UserProfileSnapshot = {
  preferredTrack: 'india' | 'ksa' | null
  name: string | null
  email: string
  profileCompletedAt: Date | null
  profile: ProfileFields
}

/**
 * Returns enough of the user record to render the profile + setup pages
 * and to gate redirects (preferredTrack + profileCompletedAt).
 */
export async function getUserProfile(userId: string): Promise<UserProfileSnapshot | null> {
  const rows = await prisma.$queryRaw<
    {
      preferredTrack: 'india' | 'ksa' | null
      name: string | null
      email: string
      profileCompletedAt: Date | null
      phone: string | null
      country: string | null
      city: string | null
      currentRole: string | null
      currentEmployer: string | null
      experienceYears: number | null
      examGoal: string | null
      studyHoursPerWeek: number | null
      targetExamDate: Date | null
      motivation: string | null
    }[]
  >`
    SELECT
      "preferredTrack",
      "name",
      "email",
      "profileCompletedAt",
      "phone",
      "country",
      "city",
      "currentRole",
      "currentEmployer",
      "experienceYears",
      "examGoal",
      "studyHoursPerWeek",
      "targetExamDate",
      "motivation"
    FROM "IdentityUser"
    WHERE "id" = ${userId}
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return null
  return {
    preferredTrack: row.preferredTrack,
    name: row.name,
    email: row.email,
    profileCompletedAt: row.profileCompletedAt,
    profile: {
      name: row.name,
      phone: row.phone,
      country: row.country,
      city: row.city,
      currentRole: row.currentRole,
      currentEmployer: row.currentEmployer,
      experienceYears: row.experienceYears,
      examGoal: row.examGoal,
      studyHoursPerWeek: row.studyHoursPerWeek,
      targetExamDate: row.targetExamDate,
      motivation: row.motivation,
    },
  }
}

/**
 * Updates the profile fields. If `markComplete` is true, also stamps
 * profileCompletedAt = now() (used by the welcome flow on first save).
 */
export async function updateUserProfile(
  userId: string,
  p: ProfileFields,
  opts: { markComplete?: boolean } = {},
): Promise<void> {
  const now = opts.markComplete ? new Date() : null
  await prisma.$executeRaw`
    UPDATE "IdentityUser"
    SET
      "name" = ${p.name},
      "phone" = ${p.phone},
      "country" = ${p.country},
      "city" = ${p.city},
      "currentRole" = ${p.currentRole},
      "currentEmployer" = ${p.currentEmployer},
      "experienceYears" = ${p.experienceYears},
      "examGoal" = ${p.examGoal},
      "studyHoursPerWeek" = ${p.studyHoursPerWeek},
      "targetExamDate" = ${p.targetExamDate},
      "motivation" = ${p.motivation},
      "profileCompletedAt" = COALESCE(${now}::timestamp, "profileCompletedAt"),
      "updatedAt" = NOW()
    WHERE "id" = ${userId}
  `
}

/**
 * Resets the user's track + profileCompletedAt so the welcome flow re-runs.
 * Used when the student wants to switch from India to KSA (or vice versa) —
 * they re-pick a market and re-take the placement test on the new track.
 *
 * Profile fields stay intact — those are person-level, not track-level.
 */
export async function resetUserTrack(userId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "IdentityUser"
    SET
      "preferredTrack" = NULL,
      "profileCompletedAt" = NULL,
      "updatedAt" = NOW()
    WHERE "id" = ${userId}
  `
}

/**
 * Hard-deletes the user and all data linked to them. Cascade FKs in the
 * Prisma schema take care of accounts, sessions, attempts, enrollments,
 * tutoring sessions, and certificates.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  await prisma.identityUser.delete({ where: { id: userId } })
}

/**
 * Returns a JSON snapshot of everything we hold about the user — used by
 * the data-export button on the profile page (DPDP / GDPR right of access).
 */
export async function exportUserData(userId: string): Promise<unknown> {
  const [user, attempts, enrollments, sessions, certificates] = await Promise.all([
    prisma.$queryRaw<unknown[]>`
      SELECT
        "id", "email", "name", "image", "locale", "preferredTrack", "role",
        "phone", "country", "city", "currentRole", "currentEmployer",
        "experienceYears", "examGoal", "studyHoursPerWeek", "targetExamDate",
        "motivation", "profileCompletedAt", "createdAt", "updatedAt"
      FROM "IdentityUser"
      WHERE "id" = ${userId}
      LIMIT 1
    `,
    prisma.assessmentAttempt.findMany({ where: { userId } }),
    prisma.learningEnrollment.findMany({ where: { userId } }),
    prisma.tutoringSession.findMany({ where: { userId } }),
    prisma.certificationCertificate.findMany({ where: { userId } }),
  ])
  return {
    exportedAt: new Date().toISOString(),
    user: Array.isArray(user) ? user[0] : user,
    attempts,
    enrollments,
    tutoringSessions: sessions,
    certificates,
  }
}
