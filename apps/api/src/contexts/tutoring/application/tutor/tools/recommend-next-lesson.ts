import { z } from 'zod'
import type { Tool } from '../../../agent/tool'
import type { MarketTrack, MasteryPort } from '../../../domain/session'

const Input = z.object({}).strict()

export type RecommendOutput = {
  candidates: { slug: string; title: string; reason: string }[]
}

/**
 * Recommends the next lesson the student should tackle. v1: lowest-mastery
 * unlocked lessons in the enrolled track. The entry-test agent will replace
 * this with adaptive placement.
 */
export const buildRecommendNextLessonTool = (
  mastery: MasteryPort,
  ctxFixed: { userId: string; market: MarketTrack },
): Tool<z.infer<typeof Input>, RecommendOutput> => ({
  name: 'recommend_next_lesson',
  description() {
    return "Recommend up to 5 next lessons for this student, ordered by curriculum progression and mastery gaps. Use this when the student asks 'what should I study next' or finishes a lesson."
  },
  inputSchema: Input,
  isReadOnly: () => true,
  async call() {
    try {
      const candidates = await mastery.recommendNext({
        userId: ctxFixed.userId,
        market: ctxFixed.market,
      })
      return { ok: true, output: { candidates } }
    } catch (err) {
      return { ok: false, error: (err as Error).message, retryable: true }
    }
  },
})
