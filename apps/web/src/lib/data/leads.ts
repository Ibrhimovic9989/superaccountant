import { randomUUID } from 'node:crypto'
import { prisma } from '@sa/db'

/**
 * Marketing-funnel lead capture (e.g. quiz on /quiz).
 *
 * Backed by raw SQL because the MarketingLead table was added via
 * scripts/add-marketing-leads.mjs and isn't yet in the generated Prisma
 * client. Once the client is regenerated, this can switch to
 * prisma.marketingLead.create.
 */

export type CreateMarketingLeadInput = {
  name: string
  email: string
  phone?: string | null
  /** Where the lead came from — e.g. '/quiz'. */
  source: string
  /** If from a quiz, the quiz slug. */
  quizSlug?: string | null
  quizScore?: number | null
  quizBucket?: string | null
  /** Raw answers for analytics: `{ questionId: optionId }`. */
  quizAnswers?: Record<string, string> | null
  locale?: string | null
  track?: 'india' | 'ksa' | null
  userAgent?: string | null
}

export async function createMarketingLead(input: CreateMarketingLeadInput): Promise<void> {
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO "MarketingLead" (
      "id", "name", "email", "phone", "source",
      "quizSlug", "quizScore", "quizBucket", "quizAnswers",
      "locale", "track", "userAgent"
    ) VALUES (
      ${id},
      ${input.name},
      ${input.email.toLowerCase()},
      ${input.phone ?? null},
      ${input.source},
      ${input.quizSlug ?? null},
      ${input.quizScore ?? null},
      ${input.quizBucket ?? null},
      ${input.quizAnswers ? JSON.stringify(input.quizAnswers) : null}::jsonb,
      ${input.locale ?? null},
      ${input.track ?? null},
      ${input.userAgent ?? null}
    )
  `
}
