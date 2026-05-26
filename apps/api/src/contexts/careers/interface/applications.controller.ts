/**
 * Job applications REST surface.
 *
 *   POST /applications/apply           — candidate applies to a job
 *   POST /applications/for-job         — HR views applicants
 *   POST /applications/for-candidate   — candidate views their own apps
 *   POST /applications/update-status   — HR shortlists / rejects / hires
 *
 * Apply gate is enforced inside the service. Authorisation for HR
 * endpoints (`for-job`, `update-status`) is expected to be enforced
 * at the calling layer — the caller verifies the requesting user is
 * a CompanyMember of the job's owning company.
 */

import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common'
import { z } from 'zod'
import { ApplicationsService } from '../application/applications.service'

export const APPLICATIONS_SERVICE = Symbol('APPLICATIONS_SERVICE')

const ApplyBody = z.object({
  userId: z.string().min(1),
  jobId: z.string().min(1),
  resumeUrl: z.string().url(),
  resumeFilename: z.string().max(200).nullable().optional(),
  coverLetter: z.string().max(4000).nullable().optional(),
})

const ForJobBody = z.object({
  jobId: z.string().min(1),
  status: z.enum(['submitted', 'shortlisted', 'rejected', 'hired']).optional(),
})

const ForCandidateBody = z.object({ userId: z.string().min(1) })

const UpdateStatusBody = z.object({
  applicationId: z.string().min(1),
  nextStatus: z.enum(['submitted', 'shortlisted', 'rejected', 'hired']),
  reason: z.string().max(500).nullable().optional(),
})

@Controller('applications')
export class ApplicationsController {
  constructor(
    @Inject(APPLICATIONS_SERVICE) private readonly service: ApplicationsService,
  ) {}

  @Post('apply')
  async apply(@Body() body: unknown) {
    try {
      const parsed = ApplyBody.parse(body)
      return await this.service.apply(parsed)
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }

  @Post('for-job')
  async forJob(@Body() body: unknown) {
    try {
      const { jobId, status } = ForJobBody.parse(body)
      return { applications: await this.service.listForJob(jobId, status) }
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }

  @Post('for-candidate')
  async forCandidate(@Body() body: unknown) {
    try {
      const { userId } = ForCandidateBody.parse(body)
      return { applications: await this.service.listForCandidate(userId) }
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }

  @Post('update-status')
  async updateStatus(@Body() body: unknown) {
    try {
      const parsed = UpdateStatusBody.parse(body)
      return await this.service.updateStatus(parsed)
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }
}
