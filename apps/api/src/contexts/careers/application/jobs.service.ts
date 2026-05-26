/**
 * JobsService — CRUD for job postings.
 *
 *   createJob          — only callable by an approved company's owner.
 *                        Delegates the approval check to CompaniesService.
 *   updateJob / closeJob — same gate.
 *   listPublic         — public job board (CLAUDE.md: browse is public).
 *                        Returns ONLY 'open' jobs belonging to 'approved'
 *                        companies. Optional filters by country and
 *                        employmentType for the /jobs board.
 *   listForCompany     — all jobs (any status) for a company's dashboard.
 *
 * Per CLAUDE.md §4.3, destructive transitions (closing a job, deleting
 * a posting) are not implemented as soft-delete here — they flip
 * status. Auditable via updatedAt + closedAt.
 */

import { randomUUID } from 'node:crypto'
import { Inject, Injectable, forwardRef } from '@nestjs/common'
import { prisma } from '@sa/db'
import type { EmploymentType, Job, JobStatus } from '../domain/types'
import { CompaniesService } from './companies.service'

const JOB_COLUMNS = `
  "id", "companyId", "title", "description", "skills",
  "employmentType", "experienceMinYears", "experienceMaxYears",
  "salaryCurrency", "salaryMinMinor", "salaryMaxMinor",
  "remoteAllowed", "country", "city", "state", "postalCode",
  "status", "publishedAt", "closedAt", "createdAt", "updatedAt"
`

export type CreateJobInput = {
  userId: string
  title: string
  description: string
  skills?: string[]
  employmentType: EmploymentType
  experienceMinYears?: number | null
  experienceMaxYears?: number | null
  salaryCurrency?: string | null
  salaryMinMinor?: number | null
  salaryMaxMinor?: number | null
  remoteAllowed?: boolean
  country: string
  city: string
  state?: string | null
  postalCode?: string | null
}

@Injectable()
export class JobsService {
  constructor(
    @Inject(forwardRef(() => CompaniesService))
    private readonly companies: CompaniesService,
  ) {}

  // ── Mutations ───────────────────────────────────────────────

  async createJob(input: CreateJobInput): Promise<Job> {
    // Single source of truth for "can this user post?" — keeps the
    // approval gate co-located with the company aggregate.
    const company = await this.companies.assertCanPostJobs(input.userId)

    const id = randomUUID()
    await prisma.$executeRaw`
      INSERT INTO "Job" (
        "id", "companyId", "title", "description", "skills",
        "employmentType", "experienceMinYears", "experienceMaxYears",
        "salaryCurrency", "salaryMinMinor", "salaryMaxMinor",
        "remoteAllowed", "country", "city", "state", "postalCode",
        "status"
      ) VALUES (
        ${id},
        ${company.id},
        ${input.title.trim()},
        ${input.description.trim()},
        ${input.skills ?? []},
        ${input.employmentType},
        ${input.experienceMinYears ?? null},
        ${input.experienceMaxYears ?? null},
        ${input.salaryCurrency ?? null},
        ${input.salaryMinMinor ?? null},
        ${input.salaryMaxMinor ?? null},
        ${input.remoteAllowed ?? false},
        ${input.country.trim()},
        ${input.city.trim()},
        ${input.state?.trim() ?? null},
        ${input.postalCode?.trim() ?? null},
        'open'
      )
    `
    return (await this.getJobById(id))!
  }

  async closeJob(args: { userId: string; jobId: string }): Promise<Job> {
    const job = await this.getJobById(args.jobId)
    if (!job) throw new Error('Job not found')
    const company = await this.companies.assertCanPostJobs(args.userId)
    if (company.id !== job.companyId) throw new Error('Not your job to close')
    if (job.status === 'closed') return job
    await prisma.$executeRaw`
      UPDATE "Job"
      SET "status" = 'closed',
          "closedAt" = NOW(),
          "updatedAt" = NOW()
      WHERE "id" = ${args.jobId}
    `
    return (await this.getJobById(args.jobId))!
  }

  // ── Reads ───────────────────────────────────────────────────

  async getJobById(id: string): Promise<Job | null> {
    const rows = await prisma.$queryRawUnsafe<Job[]>(
      `SELECT ${JOB_COLUMNS} FROM "Job" WHERE "id" = $1 LIMIT 1`,
      id,
    )
    return rows[0] ?? null
  }

  async listPublic(filters: {
    country?: string
    employmentType?: EmploymentType
    remoteOnly?: boolean
    limit?: number
    offset?: number
  } = {}): Promise<Job[]> {
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
    const offset = Math.max(filters.offset ?? 0, 0)
    // Build a dynamic WHERE without string concatenation — parameterise
    // every filter so SQL injection isn't a footgun.
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
    if (filters.remoteOnly) {
      clauses.push(`j."remoteAllowed" = TRUE`)
    }
    params.push(limit)
    const limitIdx = params.length
    params.push(offset)
    const offsetIdx = params.length

    const sql = `
      SELECT j.*
      FROM "Job" j
      JOIN "Company" c ON c."id" = j."companyId"
      WHERE ${clauses.join(' AND ')}
      ORDER BY j."publishedAt" DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `
    return prisma.$queryRawUnsafe<Job[]>(sql, ...params)
  }

  async listForCompany(args: {
    userId: string
    status?: JobStatus
  }): Promise<Job[]> {
    const company = await this.companies.getCompanyForUser(args.userId)
    if (!company) return []
    if (args.status) {
      return prisma.$queryRawUnsafe<Job[]>(
        `SELECT ${JOB_COLUMNS} FROM "Job"
         WHERE "companyId" = $1 AND "status" = $2
         ORDER BY "publishedAt" DESC`,
        company.id,
        args.status,
      )
    }
    return prisma.$queryRawUnsafe<Job[]>(
      `SELECT ${JOB_COLUMNS} FROM "Job"
       WHERE "companyId" = $1
       ORDER BY "publishedAt" DESC`,
      company.id,
    )
  }
}
