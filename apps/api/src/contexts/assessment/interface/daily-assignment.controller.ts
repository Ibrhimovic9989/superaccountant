import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Inject,
  Post,
  Query,
} from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { z } from 'zod'
import { DailyAssignmentService } from '../application/daily-assignment.service'

export const DAILY_ASSIGNMENT_SERVICE = Symbol('DAILY_ASSIGNMENT_SERVICE')

const GenerateBody = z.object({
  // Either generate for one user, or omit to generate for all active.
  userId: z.string().min(1).optional(),
})

/**
 * Cron-callable. Supabase scheduled functions hit POST /assignments/generate-daily
 * with the X-Cron-Secret header set to env.CRON_SECRET (or NEXTAUTH_SECRET as fallback).
 */
@Controller('assignments')
export class DailyAssignmentController {
  constructor(
    @Inject(DAILY_ASSIGNMENT_SERVICE) private readonly service: DailyAssignmentService,
  ) {}

  // Skip the global throttler — protected by cron secret instead. Cron + the
  // web server's lazy fallback both share one server IP and would otherwise
  // burn through the bucket quickly.
  @SkipThrottle()
  @Post('generate-daily')
  async generate(@Body() body: unknown, @Headers('x-cron-secret') secret: string | undefined) {
    const expected = process.env.CRON_SECRET ?? process.env.NEXTAUTH_SECRET
    if (!expected || secret !== expected) {
      throw new ForbiddenException('invalid cron secret')
    }
    try {
      const parsed = GenerateBody.parse(body ?? {})
      if (parsed.userId) {
        const r = await this.service.generateForUser(parsed.userId)
        return { generatedFor: 1, result: r }
      }
      return await this.service.generateForAllActiveStudents()
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }

  @Get('today')
  async today(@Query('userId') userId: string | undefined) {
    if (!userId) throw new BadRequestException('userId required')
    return (await this.service.getToday(userId)) ?? { items: [], itemCount: 0 }
  }
}
