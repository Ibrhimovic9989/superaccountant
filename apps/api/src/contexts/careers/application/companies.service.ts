/**
 * CompaniesService — onboarding + admin approval surface for the
 * careers context. Owns:
 *
 *   signupCompany     — first user from a company onboards the company
 *                       record + their CompanyMember(role=owner) row,
 *                       updates IdentityUser.role to 'company_owner'.
 *                       Status starts as 'pending_approval'.
 *   getCompanyForUser — for the companies app: "what's my company?"
 *   listPendingApprovals / approve / suspend / reinstate — admin
 *
 * All state changes that mutate `status` go through the approval state
 * machine (../domain/approval.ts) so the same illegal-transition guard
 * runs everywhere.
 */

import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { prisma } from '@sa/db'
import {
  type ApprovalEvent,
  type CompanyStatus,
  canPostJobs,
  transition,
} from '../domain/approval'
import type { Company, CompanyMember } from '../domain/types'

const COMPANY_COLUMNS = `
  "id", "name", "slug", "websiteUrl", "logoUrl", "about",
  "country", "city", "state", "postalCode",
  "status", "approvedAt", "approvedByUserId",
  "suspendedAt", "suspendReason",
  "createdAt", "updatedAt"
`

@Injectable()
export class CompaniesService {
  // ── Onboarding ──────────────────────────────────────────────

  /**
   * Onboard a new company. The current user becomes its owner
   * (CompanyMember role='owner') and their IdentityUser.role flips to
   * 'company_owner'. Company status starts as 'pending_approval' —
   * admin must approve before they can post.
   *
   * One company per user (CompanyMember UNIQUE on userId) — re-calling
   * for the same user throws.
   */
  async signupCompany(input: {
    userId: string
    name: string
    websiteUrl?: string | null
    logoUrl?: string | null
    about?: string | null
    country: string
    city: string
    state?: string | null
    postalCode?: string | null
  }): Promise<{ company: Company; member: CompanyMember }> {
    const companyId = randomUUID()
    const memberId = randomUUID()
    const slug = await this.makeUniqueSlug(input.name)

    await prisma.$transaction([
      prisma.$executeRaw`
        INSERT INTO "Company" (
          "id", "name", "slug", "websiteUrl", "logoUrl", "about",
          "country", "city", "state", "postalCode", "status"
        ) VALUES (
          ${companyId},
          ${input.name.trim()},
          ${slug},
          ${input.websiteUrl ?? null},
          ${input.logoUrl ?? null},
          ${input.about ?? null},
          ${input.country.trim()},
          ${input.city.trim()},
          ${input.state?.trim() ?? null},
          ${input.postalCode?.trim() ?? null},
          'pending_approval'
        )
      `,
      prisma.$executeRaw`
        INSERT INTO "CompanyMember" ("id", "companyId", "userId", "role")
        VALUES (${memberId}, ${companyId}, ${input.userId}, 'owner')
      `,
      // Bump the platform role so dashboards / nav can branch on it.
      prisma.$executeRaw`
        UPDATE "IdentityUser"
        SET "role" = 'company_owner', "updatedAt" = NOW()
        WHERE "id" = ${input.userId}
      `,
    ])

    const company = (await this.getCompanyById(companyId))!
    const member = await this.getMember(memberId)
    return { company, member }
  }

  // ── Reads ───────────────────────────────────────────────────

  async getCompanyById(id: string): Promise<Company | null> {
    const rows = await prisma.$queryRawUnsafe<Company[]>(
      `SELECT ${COMPANY_COLUMNS} FROM "Company" WHERE "id" = $1 LIMIT 1`,
      id,
    )
    return rows[0] ?? null
  }

  async getCompanyForUser(userId: string): Promise<Company | null> {
    // Prisma tagged templates can't interpolate column lists, so use
    // the parameterised raw variant.
    const result = await prisma.$queryRawUnsafe<Company[]>(
      `SELECT c.* FROM "Company" c
       JOIN "CompanyMember" m ON m."companyId" = c."id"
       WHERE m."userId" = $1
       LIMIT 1`,
      userId,
    )
    return result[0] ?? null
  }

  async listPendingApprovals(): Promise<Company[]> {
    return prisma.$queryRawUnsafe<Company[]>(
      `SELECT ${COMPANY_COLUMNS}
       FROM "Company"
       WHERE "status" = 'pending_approval'
       ORDER BY "createdAt" ASC`,
    )
  }

  // ── State-machine driven mutations ──────────────────────────

  async approve(companyId: string, adminUserId: string): Promise<Company> {
    return this.applyTransition(companyId, { type: 'approve', adminUserId })
  }

  async suspend(companyId: string, adminUserId: string, reason?: string): Promise<Company> {
    return this.applyTransition(companyId, { type: 'suspend', adminUserId, reason })
  }

  async reinstate(companyId: string, adminUserId: string): Promise<Company> {
    return this.applyTransition(companyId, { type: 'reinstate', adminUserId })
  }

  private async applyTransition(
    companyId: string,
    event: ApprovalEvent,
  ): Promise<Company> {
    const company = await this.getCompanyById(companyId)
    if (!company) throw new Error(`Company not found: ${companyId}`)

    const result = transition(company.status, event)
    if (!result.ok) {
      throw new Error(
        `Illegal transition: ${result.from} → ${event.type}`,
      )
    }

    await prisma.$executeRaw`
      UPDATE "Company"
      SET "status" = ${result.next}::text,
          "approvedAt" = COALESCE(${result.patch.approvedAt ?? null}, "approvedAt"),
          "approvedByUserId" = COALESCE(${result.patch.approvedByUserId ?? null}, "approvedByUserId"),
          "suspendedAt" = ${result.patch.suspendedAt ?? null},
          "suspendReason" = ${result.patch.suspendReason ?? null},
          "updatedAt" = NOW()
      WHERE "id" = ${companyId}
    `
    return (await this.getCompanyById(companyId))!
  }

  // ── Helpers ─────────────────────────────────────────────────

  /**
   * Convenience guard for the JobsService — "can this user post a
   * new job for their company?". Returns the company on success or
   * throws with a typed reason the controller can surface to the UI.
   */
  async assertCanPostJobs(userId: string): Promise<Company> {
    const company = await this.getCompanyForUser(userId)
    if (!company) throw new Error('not_a_company_member')
    if (!canPostJobs(company.status)) {
      throw new Error(`company_not_approved:${company.status}`)
    }
    return company
  }

  private async getMember(id: string): Promise<CompanyMember> {
    const rows = await prisma.$queryRaw<CompanyMember[]>`
      SELECT "id", "companyId", "userId", "role", "createdAt"
      FROM "CompanyMember"
      WHERE "id" = ${id}
      LIMIT 1
    `
    if (!rows[0]) throw new Error(`CompanyMember not found: ${id}`)
    return rows[0]
  }

  /**
   * Slug = lowercased name with non-alphanum collapsed to '-', plus a
   * short random suffix on collision. Slug is for URL routing (e.g.
   * /companies/<slug>); not a stable id.
   */
  private async makeUniqueSlug(name: string): Promise<string> {
    const base = name
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
    // Shouldn't reach here unless we're profoundly unlucky.
    return `${base}-${randomUUID().slice(0, 8)}`
  }
}
