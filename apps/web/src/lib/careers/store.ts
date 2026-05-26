import { randomUUID } from 'node:crypto'
import { prisma } from '@sa/db'
import {
  type ApprovalEvent,
  type CompanyStatus,
  transition,
} from './approval'

/**
 * Server-side careers store for apps/web. Mirrors the NestJS services
 * in apps/api/src/contexts/careers/. Direct Prisma access — matches
 * the cohort + loyalty patterns. If you change the apply gate here,
 * change it in apps/api/src/contexts/careers/application/applications.service.ts
 * too — both must stay in lockstep.
 */

export type Company = {
  id: string
  name: string
  slug: string
  websiteUrl: string | null
  logoUrl: string | null
  about: string | null
  country: string
  city: string
  state: string | null
  postalCode: string | null
  status: CompanyStatus
  approvedAt: Date | null
  approvedByUserId: string | null
  suspendedAt: Date | null
  suspendReason: string | null
  createdAt: Date
  updatedAt: Date
}

export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship'
export type JobStatus = 'open' | 'closed' | 'filled'

export type Job = {
  id: string
  companyId: string
  title: string
  description: string
  skills: string[]
  employmentType: EmploymentType
  experienceMinYears: number | null
  experienceMaxYears: number | null
  salaryCurrency: string | null
  salaryMinMinor: number | null
  salaryMaxMinor: number | null
  remoteAllowed: boolean
  country: string
  city: string
  state: string | null
  postalCode: string | null
  status: JobStatus
  publishedAt: Date
  closedAt: Date | null
}

export type JobWithCompany = Job & {
  companyName: string
  companySlug: string
  companyLogoUrl: string | null
}

export type ApplicationStatus = 'submitted' | 'shortlisted' | 'rejected' | 'hired'

export type JobApplication = {
  id: string
  jobId: string
  candidateUserId: string
  resumeUrl: string
  resumeFilename: string | null
  coverLetter: string | null
  candidateName: string
  candidateEmail: string
  candidatePhone: string | null
  candidateGrandTestScore: number | null
  candidateCohortPhase: number | null
  status: ApplicationStatus
  statusReason: string | null
  createdAt: Date
}

// ── Companies ─────────────────────────────────────────────────

export async function getCompanyForUser(userId: string): Promise<Company | null> {
  const rows = await prisma.$queryRawUnsafe<Company[]>(
    `SELECT c.* FROM "Company" c
     JOIN "CompanyMember" m ON m."companyId" = c."id"
     WHERE m."userId" = $1
     LIMIT 1`,
    userId,
  )
  return rows[0] ?? null
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const rows = await prisma.$queryRaw<Company[]>`
    SELECT * FROM "Company" WHERE "id" = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

export async function listPendingCompanies(): Promise<Company[]> {
  return prisma.$queryRaw<Company[]>`
    SELECT * FROM "Company"
    WHERE "status" = 'pending_approval'
    ORDER BY "createdAt" ASC
  `
}

export async function listApprovedCompanies(): Promise<Company[]> {
  return prisma.$queryRaw<Company[]>`
    SELECT * FROM "Company"
    WHERE "status" = 'approved'
    ORDER BY "approvedAt" DESC NULLS LAST
  `
}

export async function signupCompany(input: {
  userId: string
  name: string
  websiteUrl?: string | null
  logoUrl?: string | null
  about?: string | null
  country: string
  city: string
  state?: string | null
  postalCode?: string | null
}): Promise<Company> {
  const id = randomUUID()
  const memberId = randomUUID()
  const slug = await makeUniqueSlug(input.name)
  await prisma.$transaction([
    prisma.$executeRaw`
      INSERT INTO "Company" (
        "id", "name", "slug", "websiteUrl", "logoUrl", "about",
        "country", "city", "state", "postalCode", "status"
      ) VALUES (
        ${id}, ${input.name.trim()}, ${slug},
        ${input.websiteUrl ?? null}, ${input.logoUrl ?? null}, ${input.about ?? null},
        ${input.country.trim()}, ${input.city.trim()},
        ${input.state?.trim() ?? null}, ${input.postalCode?.trim() ?? null},
        'pending_approval'
      )
    `,
    prisma.$executeRaw`
      INSERT INTO "CompanyMember" ("id", "companyId", "userId", "role")
      VALUES (${memberId}, ${id}, ${input.userId}, 'owner')
    `,
    prisma.$executeRaw`
      UPDATE "IdentityUser"
      SET "role" = 'company_owner', "updatedAt" = NOW()
      WHERE "id" = ${input.userId}
    `,
  ])
  return (await getCompanyById(id))!
}

export async function applyCompanyTransition(args: {
  companyId: string
  event: ApprovalEvent
}): Promise<Company> {
  const company = await getCompanyById(args.companyId)
  if (!company) throw new Error('company_not_found')
  const result = transition(company.status, args.event)
  if (!result.ok) throw new Error(`illegal_transition:${company.status}->${args.event.type}`)
  await prisma.$executeRaw`
    UPDATE "Company"
    SET "status" = ${result.next}::text,
        "approvedAt" = COALESCE(${result.patch.approvedAt ?? null}, "approvedAt"),
        "approvedByUserId" = COALESCE(${result.patch.approvedByUserId ?? null}, "approvedByUserId"),
        "suspendedAt" = ${result.patch.suspendedAt ?? null},
        "suspendReason" = ${result.patch.suspendReason ?? null},
        "updatedAt" = NOW()
    WHERE "id" = ${args.companyId}
  `
  return (await getCompanyById(args.companyId))!
}

// ── Jobs ──────────────────────────────────────────────────────

export async function createJob(input: {
  companyId: string
  title: string
  description: string
  skills: string[]
  employmentType: EmploymentType
  experienceMinYears: number | null
  experienceMaxYears: number | null
  salaryCurrency: string | null
  salaryMinMinor: number | null
  salaryMaxMinor: number | null
  remoteAllowed: boolean
  country: string
  city: string
  state: string | null
  postalCode: string | null
}): Promise<Job> {
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO "Job" (
      "id", "companyId", "title", "description", "skills",
      "employmentType", "experienceMinYears", "experienceMaxYears",
      "salaryCurrency", "salaryMinMinor", "salaryMaxMinor",
      "remoteAllowed", "country", "city", "state", "postalCode",
      "status"
    ) VALUES (
      ${id}, ${input.companyId}, ${input.title.trim()}, ${input.description.trim()},
      ${input.skills},
      ${input.employmentType},
      ${input.experienceMinYears}, ${input.experienceMaxYears},
      ${input.salaryCurrency}, ${input.salaryMinMinor}, ${input.salaryMaxMinor},
      ${input.remoteAllowed},
      ${input.country.trim()}, ${input.city.trim()},
      ${input.state?.trim() ?? null}, ${input.postalCode?.trim() ?? null},
      'open'
    )
  `
  const rows = await prisma.$queryRaw<Job[]>`SELECT * FROM "Job" WHERE "id" = ${id} LIMIT 1`
  return rows[0]!
}

export async function listPublicJobs(filters: {
  country?: string
  employmentType?: EmploymentType
  remoteOnly?: boolean
  limit?: number
  offset?: number
} = {}): Promise<JobWithCompany[]> {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
  const offset = Math.max(filters.offset ?? 0, 0)
  const clauses: string[] = [`j."status" = 'open'`, `c."status" = 'approved'`]
  const params: unknown[] = []
  if (filters.country) {
    params.push(filters.country)
    clauses.push(`j."country" = $${params.length}`)
  }
  if (filters.employmentType) {
    params.push(filters.employmentType)
    clauses.push(`j."employmentType" = $${params.length}`)
  }
  if (filters.remoteOnly) clauses.push(`j."remoteAllowed" = TRUE`)
  params.push(limit)
  params.push(offset)
  const sql = `
    SELECT j.*, c."name" AS "companyName", c."slug" AS "companySlug", c."logoUrl" AS "companyLogoUrl"
    FROM "Job" j
    JOIN "Company" c ON c."id" = j."companyId"
    WHERE ${clauses.join(' AND ')}
    ORDER BY j."publishedAt" DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `
  return prisma.$queryRawUnsafe<JobWithCompany[]>(sql, ...params)
}

export async function getJobWithCompany(jobId: string): Promise<JobWithCompany | null> {
  const rows = await prisma.$queryRawUnsafe<JobWithCompany[]>(
    `SELECT j.*, c."name" AS "companyName", c."slug" AS "companySlug", c."logoUrl" AS "companyLogoUrl"
     FROM "Job" j
     JOIN "Company" c ON c."id" = j."companyId"
     WHERE j."id" = $1
     LIMIT 1`,
    jobId,
  )
  return rows[0] ?? null
}

export async function listJobsForCompany(companyId: string): Promise<Job[]> {
  return prisma.$queryRaw<Job[]>`
    SELECT * FROM "Job" WHERE "companyId" = ${companyId}
    ORDER BY "publishedAt" DESC
  `
}

export async function closeJob(args: { jobId: string; companyId: string }): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "Job"
    SET "status" = 'closed', "closedAt" = NOW(), "updatedAt" = NOW()
    WHERE "id" = ${args.jobId} AND "companyId" = ${args.companyId}
  `
}

// ── Apply gate + application submit ───────────────────────────

export type ApplyEligibility =
  | { eligible: true; grandTestScore: number; cohortPhase: number }
  | { eligible: false; reason: 'not_signed_in' | 'not_enrolled' | 'grand_test_not_passed' }

/**
 * Server-side apply gate. Mirrors apply gate in
 * apps/api/src/contexts/careers/application/applications.service.ts.
 *
 *   1. user must be signed in
 *   2. user must have a paid CohortApplication (by email)
 *   3. user must have a passing AssessmentAttempt of kind='grand'
 */
export async function checkApplyEligibility(userId: string | null): Promise<ApplyEligibility> {
  if (!userId) return { eligible: false, reason: 'not_signed_in' }
  const user = await prisma.identityUser.findUnique({
    where: { id: userId },
    select: { email: true, preferredTrack: true },
  })
  if (!user) return { eligible: false, reason: 'not_signed_in' }

  const paid = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "CohortApplication"
    WHERE LOWER("email") = LOWER(${user.email}) AND "status" = 'paid'
    LIMIT 1
  `
  if (!paid[0]) return { eligible: false, reason: 'not_enrolled' }

  const best = await prisma.assessmentAttempt.findFirst({
    where: { userId, kind: 'grand', status: 'graded', score: { gte: 0.7 } },
    orderBy: { score: 'desc' },
    select: { score: true },
  })
  // Prisma types `score` as nullable even though the where-clause
  // filters out nulls. Narrow explicitly.
  if (!best || best.score === null) {
    return { eligible: false, reason: 'grand_test_not_passed' }
  }

  const cohortPhase = user.preferredTrack
    ? await computeCohortPhase(userId, user.preferredTrack as 'india' | 'ksa')
    : 0
  return { eligible: true, grandTestScore: best.score, cohortPhase }
}

export async function submitApplication(input: {
  userId: string
  jobId: string
  resumeUrl: string
  resumeFilename: string | null
  coverLetter: string | null
}): Promise<
  | { ok: true; applicationId: string }
  | { ok: false; reason: 'job_not_open' | 'not_enrolled' | 'grand_test_not_passed' | 'already_applied' }
> {
  const job = await prisma.$queryRawUnsafe<Job[]>(
    `SELECT j.* FROM "Job" j
     JOIN "Company" c ON c."id" = j."companyId"
     WHERE j."id" = $1 AND j."status" = 'open' AND c."status" = 'approved'
     LIMIT 1`,
    input.jobId,
  )
  if (!job[0]) return { ok: false, reason: 'job_not_open' }

  const eligibility = await checkApplyEligibility(input.userId)
  if (!eligibility.eligible) {
    if (eligibility.reason === 'not_signed_in') return { ok: false, reason: 'not_enrolled' }
    return { ok: false, reason: eligibility.reason }
  }

  const user = await prisma.identityUser.findUnique({
    where: { id: input.userId },
    select: { name: true, email: true, phone: true },
  })
  if (!user) return { ok: false, reason: 'not_enrolled' }

  const id = randomUUID()
  try {
    await prisma.$executeRaw`
      INSERT INTO "JobApplication" (
        "id", "jobId", "candidateUserId",
        "resumeUrl", "resumeFilename", "coverLetter",
        "candidateName", "candidateEmail", "candidatePhone",
        "candidateGrandTestScore", "candidateCohortPhase",
        "status"
      ) VALUES (
        ${id}, ${input.jobId}, ${input.userId},
        ${input.resumeUrl}, ${input.resumeFilename}, ${input.coverLetter},
        ${user.name ?? user.email}, ${user.email}, ${user.phone},
        ${eligibility.grandTestScore}, ${eligibility.cohortPhase},
        'submitted'
      )
    `
    return { ok: true, applicationId: id }
  } catch (e) {
    const msg = (e as Error).message ?? ''
    if (msg.includes('23505') || /unique/i.test(msg)) {
      return { ok: false, reason: 'already_applied' }
    }
    throw e
  }
}

export async function listApplicationsForJob(jobId: string): Promise<JobApplication[]> {
  return prisma.$queryRaw<JobApplication[]>`
    SELECT * FROM "JobApplication"
    WHERE "jobId" = ${jobId}
    ORDER BY "createdAt" DESC
  `
}

export async function hasUserAppliedToJob(args: {
  userId: string
  jobId: string
}): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "JobApplication"
    WHERE "jobId" = ${args.jobId} AND "candidateUserId" = ${args.userId}
    LIMIT 1
  `
  return rows.length > 0
}

// ── Helpers ───────────────────────────────────────────────────

async function computeCohortPhase(userId: string, market: 'india' | 'ksa'): Promise<number> {
  const enrollment = await prisma.learningEnrollment.findFirst({
    where: { userId, trackId: market },
    select: { id: true },
  })
  if (!enrollment) return 0
  const phases = await prisma.curriculumPhase.findMany({
    where: { track: { market } },
    orderBy: { order: 'asc' },
    select: {
      order: true,
      modules: { select: { lessons: { select: { id: true } } } },
    },
  })
  let maxComplete = 0
  for (const phase of phases) {
    const lessonIds = phase.modules.flatMap((m) => m.lessons.map((l) => l.id))
    if (lessonIds.length === 0) continue
    const completedCount = await prisma.learningProgress.count({
      where: { enrollmentId: enrollment.id, lessonId: { in: lessonIds } },
    })
    if (completedCount >= lessonIds.length) maxComplete = phase.order
    else break
  }
  return maxComplete
}

async function makeUniqueSlug(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 48) || 'company'
  let candidate = base
  for (let i = 0; i < 5; i++) {
    const taken = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Company" WHERE "slug" = ${candidate} LIMIT 1
    `
    if (!taken[0]) return candidate
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`
  }
  return `${base}-${randomUUID().slice(0, 8)}`
}
