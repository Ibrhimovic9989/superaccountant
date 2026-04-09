import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common'
import { z } from 'zod'
import { EntryTestService } from '../application/entry-test/entry-test.service'

export const ENTRY_TEST_SERVICE = Symbol('ENTRY_TEST_SERVICE')

const StartBody = z.object({
  userId: z.string().min(1),
  market: z.enum(['india', 'ksa']),
  locale: z.enum(['en', 'ar']),
})

const QuestionShape = z.object({
  id: z.string().optional(),
  prompt: z.string(),
  choices: z.array(z.string()),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  topic: z.string(),
  answerIndex: z.number().int(),
  explanation: z.string(),
})

const HistoryItemShape = z.object({
  question: QuestionShape,
  studentAnswerIndex: z.number().int(),
  isCorrect: z.boolean(),
  askedAt: z.string(),
})

const AnswerBody = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  market: z.enum(['india', 'ksa']),
  locale: z.enum(['en', 'ar']),
  question: QuestionShape,
  choiceIndex: z.number().int().min(0),
  /** Running history (excluding the question being answered now). The server
   *  rebuilds the new entry from `question` + `choiceIndex` and appends. */
  priorHistory: z.array(HistoryItemShape).default([]),
})

@Controller('entry-test')
export class EntryTestController {
  constructor(@Inject(ENTRY_TEST_SERVICE) private readonly service: EntryTestService) {}

  @Post('start')
  async start(@Body() body: unknown) {
    try {
      const parsed = StartBody.parse(body)
      return await this.service.start(parsed)
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }

  @Post('answer')
  async answer(@Body() body: unknown) {
    try {
      const parsed = AnswerBody.parse(body)
      // Server constructs the authoritative new history from prior + this answer.
      const isCorrect = parsed.choiceIndex === parsed.question.answerIndex
      const runningHistory = [
        ...parsed.priorHistory,
        {
          question: parsed.question,
          studentAnswerIndex: parsed.choiceIndex,
          isCorrect,
          askedAt: new Date().toISOString(),
        },
      ]
      return await this.service.answerWithQuestion({
        sessionId: parsed.sessionId,
        userId: parsed.userId,
        market: parsed.market,
        locale: parsed.locale,
        question: parsed.question,
        choiceIndex: parsed.choiceIndex,
        runningHistory,
      })
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }
}
