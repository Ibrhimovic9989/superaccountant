import { BadRequestException, Body, Controller, Inject, Post, Res } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Response } from 'express'
import { TutorAskBodySchema, type TutorAskBody } from './tutor.dto'
import { TutoringAgent } from '../application/tutor/tutoring.agent'
import { TUTORING_AGENT } from '../tutoring.tokens'

/**
 * SSE-streamed tutor endpoint.
 *
 * Wire format: each line is `data: {json}\n\n`. Events match the AgentEvent
 * union from agent-loop.ts (text_delta, tool_call, tool_result, usage, done, error).
 *
 * The Next.js web app consumes this via EventSource at /api/agent/stream.
 */
@Controller('tutor')
export class TutorController {
  constructor(@Inject(TUTORING_AGENT) private readonly agent: TutoringAgent) {}

  // Tutor ask is the most expensive endpoint we have — every call hits Azure
  // OpenAI for both embeddings and the chat model. Cap at 30 messages/minute
  // and 200/hour per IP. The hourly cap roughly corresponds to a serious
  // study session; beyond that the user is almost certainly scripting.
  @Throttle({
    medium: { ttl: 60_000, limit: 30 },
    long: { ttl: 3_600_000, limit: 200 },
  })
  @Post('ask')
  async ask(@Body() body: unknown, @Res() res: Response): Promise<void> {
    let parsed: TutorAskBody
    try {
      parsed = TutorAskBodySchema.parse(body)
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders?.()

    const abort = new AbortController()
    res.on('close', () => abort.abort())

    const send = (event: unknown) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    }

    try {
      for await (const event of this.agent.run({
        session: {
          sessionId: parsed.sessionId,
          userId: parsed.userId,
          market: parsed.market,
          locale: parsed.locale,
          currentLessonSlug: parsed.currentLessonSlug,
          goal: parsed.goal,
        },
        userMessage: parsed.message,
        signal: abort.signal,
        onProgress: (e) => send({ type: 'progress', ...e }),
      })) {
        send(event)
        if (event.type === 'done' || event.type === 'error') break
      }
    } catch (err) {
      send({ type: 'error', error: (err as Error).message })
    } finally {
      res.end()
    }
  }
}
