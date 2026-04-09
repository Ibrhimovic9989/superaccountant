import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common'
import { z } from 'zod'
import { MarkCompleteService } from '../application/mark-complete.service'

export const MARK_COMPLETE_SERVICE = Symbol('MARK_COMPLETE_SERVICE')

const Body_ = z.object({
  userId: z.string().min(1),
  lessonSlug: z.string().min(1),
  mcqCorrect: z.number().int().min(0),
  mcqTotal: z.number().int().min(0),
  shortAnswerScores: z.array(z.number().min(0).max(1)).optional(),
})

@Controller('learning')
export class LearningController {
  constructor(@Inject(MARK_COMPLETE_SERVICE) private readonly markComplete: MarkCompleteService) {}

  @Post('mark-complete')
  async complete(@Body() body: unknown) {
    try {
      const parsed = Body_.parse(body)
      return await this.markComplete.execute(parsed)
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }
}
