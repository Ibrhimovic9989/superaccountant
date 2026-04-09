import { z } from 'zod'
import { azureOpenAI } from '@sa/ai'
import type { Tool } from '../../../agent/tool'
import type { Locale } from '../../../domain/session'

const Input = z.object({
  topic: z.string().describe('The lesson title or learning objective to test on.'),
  type: z.enum(['mcq', 'short_answer', 'scenario']).default('mcq'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  groundingContext: z
    .string()
    .optional()
    .describe('Paste relevant lesson body returned by search_curriculum so the question stays on-curriculum.'),
})

const Output = z.object({
  prompt: z.string(),
  choices: z.array(z.string()).optional(),
  modelAnswer: z.string(),
  rubric: z.string().optional(),
})

export type PracticeOutput = z.infer<typeof Output>

const systemFor = (locale: Locale) =>
  locale === 'ar'
    ? `أنشئ سؤال تدريب واحد للطالب. أعد JSON صارم: { prompt (بالعربية), choices? (للأسئلة من نوع MCQ)، modelAnswer، rubric? }. تأكد من أن السؤال له إجابة قابلة للتقييم بشكل موضوعي.`
    : `Generate a single practice question for the student. Return STRICT JSON: { prompt, choices? (for MCQ), modelAnswer, rubric? }. The question must have an objectively gradeable answer. Use only facts present in the supplied grounding context if provided.`

export const buildGeneratePracticeQuestionTool = (
  ctxFixed: { locale: Locale },
): Tool<z.infer<typeof Input>, PracticeOutput> => ({
  name: 'generate_practice_question',
  description() {
    return 'Generate ONE practice question on a specific topic. Use this when the student wants to test their understanding or you spot a weak area. Pair with assess_answer afterward.'
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
            content: `Topic: ${input.topic}\nType: ${input.type}\nDifficulty: ${input.difficulty}${
              input.groundingContext ? `\n\nGrounding context:\n${input.groundingContext}` : ''
            }`,
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
