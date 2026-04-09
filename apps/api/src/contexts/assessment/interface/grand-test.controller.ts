import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { z } from 'zod'
import { GrandTestService } from '../application/grand-test.service'
import { CertificationService } from '../../certification/application/certification.service'

export const GRAND_TEST_SERVICE = Symbol('GRAND_TEST_SERVICE')
export const CERTIFICATION_SERVICE = Symbol('CERTIFICATION_SERVICE')

const StartBody = z.object({ userId: z.string().min(1) })
const SubmitBody = z.object({
  userId: z.string().min(1),
  attemptId: z.string().min(1),
  answers: z.record(z.string()),
})

@Controller('grand-test')
export class GrandTestController {
  constructor(
    @Inject(GRAND_TEST_SERVICE) private readonly grand: GrandTestService,
    @Inject(CERTIFICATION_SERVICE) private readonly cert: CertificationService,
  ) {}

  // Grand test is a 3-hour, 30-question proctored exam — each /start spins
  // up a new attempt and pulls a fresh question pool. 5/hour and 20/day per
  // IP is far more than any real student needs, but stops scripted abuse.
  @Throttle({
    long: { ttl: 3_600_000, limit: 5 },
    medium: { ttl: 86_400_000, limit: 20 },
  })
  @Post('start')
  async start(@Body() body: unknown) {
    try {
      const parsed = StartBody.parse(body)
      return await this.grand.start(parsed)
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }

  @Post('submit')
  async submit(@Body() body: unknown) {
    try {
      const parsed = SubmitBody.parse(body)
      const result = await this.grand.submit(parsed)
      // On pass → issue certificate.
      if (result.passed) {
        // Look up market via the attempt.
        // (We avoid pulling Prisma here; the cert service does it.)
        const certificate = await this.cert.issue({
          userId: parsed.userId,
          attemptId: result.attemptId,
          // We pass india as a placeholder; the service will read the user
          // record. To keep things simple for v1, derive market from the
          // user's preferredTrack inside the service.
          // Re-fetching here to keep this controller thin.
          market: await this.userMarket(parsed.userId),
          score: result.score,
        })
        return { ...result, certificateHash: certificate.hash }
      }
      return result
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }

  private async userMarket(userId: string): Promise<'india' | 'ksa'> {
    const { prisma } = await import('@sa/db')
    const u = await prisma.identityUser.findUnique({
      where: { id: userId },
      select: { preferredTrack: true },
    })
    return (u?.preferredTrack ?? 'india') as 'india' | 'ksa'
  }
}
