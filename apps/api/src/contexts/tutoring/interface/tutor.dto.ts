import { z } from 'zod'

export const TutorAskBodySchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  market: z.enum(['india', 'ksa']),
  locale: z.enum(['en', 'ar']),
  currentLessonSlug: z.string().optional(),
  goal: z.string().optional(),
  message: z.string().min(1),
})

export type TutorAskBody = z.infer<typeof TutorAskBodySchema>
