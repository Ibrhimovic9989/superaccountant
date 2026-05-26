/**
 * Companies REST surface.
 *
 *   POST /companies/signup            — first onboarding for a user
 *   POST /companies/me                — "what company am I a member of?"
 *   POST /companies/pending           — admin: list pending approvals
 *   POST /companies/approve           — admin: approve a pending company
 *   POST /companies/suspend           — admin: suspend an approved company
 *   POST /companies/reinstate         — admin: lift a suspension
 *
 * Authorisation: this controller does not authenticate the caller —
 * it expects `userId` on the body and assumes the calling surface
 * (Next.js server action) has already verified the session. The
 * admin endpoints additionally require the caller to verify the
 * platform role server-side before invoking; we don't re-check here
 * because cross-context role lookups would couple the contexts.
 */

import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common'
import { z } from 'zod'
import { CompaniesService } from '../application/companies.service'

export const COMPANIES_SERVICE = Symbol('COMPANIES_SERVICE')

const SignupBody = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).max(120),
  websiteUrl: z.string().url().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  about: z.string().max(2000).nullable().optional(),
  country: z.string().length(2), // ISO-3166 alpha-2
  city: z.string().min(1).max(80),
  state: z.string().max(80).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
})

const UserIdBody = z.object({ userId: z.string().min(1) })

const ApprovalBody = z.object({
  adminUserId: z.string().min(1),
  companyId: z.string().min(1),
  reason: z.string().max(500).optional(),
})

@Controller('companies')
export class CompaniesController {
  constructor(@Inject(COMPANIES_SERVICE) private readonly service: CompaniesService) {}

  @Post('signup')
  async signup(@Body() body: unknown) {
    try {
      const parsed = SignupBody.parse(body)
      return await this.service.signupCompany(parsed)
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }

  @Post('me')
  async me(@Body() body: unknown) {
    try {
      const { userId } = UserIdBody.parse(body)
      const company = await this.service.getCompanyForUser(userId)
      return { company }
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }

  @Post('pending')
  async pending() {
    return { companies: await this.service.listPendingApprovals() }
  }

  @Post('approve')
  async approve(@Body() body: unknown) {
    try {
      const { adminUserId, companyId } = ApprovalBody.parse(body)
      return await this.service.approve(companyId, adminUserId)
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }

  @Post('suspend')
  async suspend(@Body() body: unknown) {
    try {
      const { adminUserId, companyId, reason } = ApprovalBody.parse(body)
      return await this.service.suspend(companyId, adminUserId, reason)
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }

  @Post('reinstate')
  async reinstate(@Body() body: unknown) {
    try {
      const { adminUserId, companyId } = ApprovalBody.parse(body)
      return await this.service.reinstate(companyId, adminUserId)
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }
}
