import { z } from 'zod'
import { azureOpenAI } from '@sa/ai'
import type { Tool } from '../../../agent/tool'
import type { Locale } from '../../../domain/session'

const Input = z.object({
  question: z.string(),
  studentAnswer: z.string(),
  modelAnswer: z.string().optional().describe('If the question came from generate_practice_question, pass the model answer here.'),
  rubric: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
})

export type AssessOutput = {
  score: number // 0..1
  verdict: 'correct' | 'partial' | 'incorrect'
  feedback: string
  whatToReview?: string
}

const systemFor = (locale: Locale) =>
  locale === 'ar'
    ? `أنت مدرس محاسبة. قيّم إجابة الطالب. أعد JSON صارم: { score (0..1), verdict, feedback (بالعربية الفصحى), whatToReview? }. كن عادلاً ومحدداً.`
    : `You are an accounting tutor. Grade the student's answer. Return STRICT JSON: { score (0..1), verdict, feedback, whatToReview? }. Be fair and specific. Cite exactly what was right and what was wrong.`

const Output = z.object({
  score: z.number().min(0).max(1),
  verdict: z.enum(['correct', 'partial', 'incorrect']),
  feedback: z.string(),
  whatToReview: z.string().optional(),
})

export const buildAssessAnswerTool = (
  ctxFixed: { locale: Locale },
): Tool<z.infer<typeof Input>, AssessOutput> => ({
  name: 'assess_answer',
  description() {
    return "Grade a student's answer against a question. Returns a score, verdict (correct/partial/incorrect), specific feedback, and a review suggestion. Use this whenever the student attempts an exercise or you want to check their understanding."
  },
  inputSchema: Input,
  isReadOnly: () => true,
  async call(input) {
    try {
      const res = await azureOpenAI().chat.completions.create({
        model: 'placeholder',
        messages: [
          { role: 'system', content: systemFor(ctxFixed.locale) },
          {
            role: 'user',
            content: `Question:\n${input.question}\n\nStudent answer:\n${input.studentAnswer}${
              input.modelAnswer ? `\n\nModel answer:\n${input.modelAnswer}` : ''
            }${input.rubric ? `\n\nRubric:\n${input.rubric}` : ''}\n\nDifficulty: ${input.difficulty}`,
          },
        ],
        response_format: { type: 'json_object' },
      })
      const parsed = Output.parse(JSON.parse(res.choices[0]?.message.content ?? '{}'))
      return { ok: true, output: parsed }
    } catch (err) {
      return { ok: false, error: (err as Error).message, retryable: true }
    }
  },
})
