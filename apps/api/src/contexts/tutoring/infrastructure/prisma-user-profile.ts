import { prisma } from '@sa/db'
import type { StudentProfile, UserProfilePort } from '../domain/session'

/**
 * Reads the student profile fields that personalize the tutor.
 *
 * Uses raw SQL because the new profile columns (phone, country, city,
 * examGoal, experienceYears, etc.) were added via add-profile-fields.mjs
 * and aren't yet in the generated Prisma client. Once the client is
 * regenerated, this can switch to prisma.identityUser.findUnique.
 */
export class PrismaUserProfile implements UserProfilePort {
  async getStudentProfile(userId: string): Promise<StudentProfile | null> {
    const rows = await prisma.$queryRaw<
      {
        name: string | null
        examGoal: string | null
        jobGoal: string | null
        experienceYears: number | null
        currentRole: string | null
        currentEmployer: string | null
        studyHoursPerWeek: number | null
        targetExamDate: Date | null
        motivation: string | null
        country: string | null
        city: string | null
      }[]
    >`
      SELECT
        "name",
        "examGoal",
        "jobGoal",
        "experienceYears",
        "currentRole",
        "currentEmployer",
        "studyHoursPerWeek",
        "targetExamDate",
        "motivation",
        "country",
        "city"
      FROM "IdentityUser"
      WHERE "id" = ${userId}
      LIMIT 1
    `
    const row = rows[0]
    if (!row) return null
    return {
      name: row.name,
      examGoal: row.examGoal,
      jobGoal: row.jobGoal,
      experienceYears: row.experienceYears,
      currentRole: row.currentRole,
      currentEmployer: row.currentEmployer,
      studyHoursPerWeek: row.studyHoursPerWeek,
      targetExamDate: row.targetExamDate,
      motivation: row.motivation,
      country: row.country,
      city: row.city,
    }
  }
}
