/**
 * Jobs REST surface.
 *
 *   POST /jobs/create           — approved companies post a job
 *   POST /jobs/close            — owner closes one of their jobs
 *   POST /jobs/public           — public job board listing (filterable)
 *   POST /jobs/for-company      — HR sees all their company's jobs
 *   POST /jobs/get              — single job by id (public)
 */

import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common'
import { z } from 'zod'
import { JobsService } from '../application/jobs.service'

export const JOBS_SERVICE = Symbol('JOBS_SERVICE')

const CreateJobBody = z.object({
  userId: z.string().min(1),
  title: z.string().min(2).max(150),
  description: z.string().min(20).max(8000),
  skills: z.array(z.string().min(1).max(40)).max(30).optional(),
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'internship']),
  experienceMinYears: z.number().int().min(0).max(50).nullable().optional(),
  experienceMaxYears: z.number().int().min(0).max(50).nullable().optional(),
  salaryCurrency: z.string().length(3).nullable().optional(),
  salaryMinMinor: z.number().int().min(0).nullable().optional(),
  salaryMaxMinor: z.number().int().min(0).nullable().optional(),
  remoteAllowed: z.boolean().optional(),
  country: z.string().length(2),
  city: z.string().min(1).max(80),
  state: z.string().max(80).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
})

const CloseJobBody = z.object({ userId: z.string().min(1), jobId: z.string().min(1) })

const PublicListBody = z.object({
  country: z.string().length(2).optional(),
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'internship']).optional(),
  remoteOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
})

const ForCompanyBody = z.object({
  userId: z.string().min(1),
  status: z.enum(['open', 'closed', 'filled']).optional(),
})

const GetJobBody = z.object({ jobId: z.string().min(1) })

@Controller('jobs')
export class JobsController {
  constructor(@Inject(JOBS_SERVICE) private readonly service: JobsService) {}

  @Post('create')
  async create(@Body() body: unknown) {
    try {
      const parsed = CreateJobBody.parse(body)
      return await this.service.createJob(parsed)
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }

  @Post('close')
  async close(@Body() body: unknown) {
    try {
      const parsed = CloseJobBody.parse(body)
      return await this.service.closeJob(parsed)
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }

  @Post('public')
  async listPublic(@Body() body: unknown) {
    try {
      const parsed = PublicListBody.parse(body ?? {})
      return { jobs: await this.service.listPublic(parsed) }
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }

  @Post('for-company')
  async listForCompany(@Body() body: unknown) {
    try {
      const parsed = ForCompanyBody.parse(body)
      return { jobs: await this.service.listForCompany(parsed) }
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }

  @Post('get')
  async get(@Body() body: unknown) {
    try {
      const { jobId } = GetJobBody.parse(body)
      const job = await this.service.getJobById(jobId)
      return { job }
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }
}
