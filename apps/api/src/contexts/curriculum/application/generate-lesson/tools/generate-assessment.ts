import { z } from 'zod'
import { azureOpenAI } from '@sa/ai'
import type { Tool } from '../../../../tutoring/agent/tool'
import type { ArtifactCache } from '../artifact-cache'

const Input = z.object({
  mdxEn: z.string().min(50),
  mdxAr: z.string().min(50),
  title: z.string(),
  learningObjectives: z.array(z.string()).min(1),
})

// Tolerant schema: normalises common model variations (MCQ → mcq, ShortAnswer →
// short_answer) and accepts either string or {en, ar} for answer/rubric.
const flexString = z.preprocess(
  (v) => (typeof v === 'string' ? v : v && typeof v === 'object' ? JSON.stringify(v) : v),
  z.string(),
)
const ItemSchema = z.object({
  type: z.preprocess(
    (v) =>
      typeof v === 'string'
        ? v.toLowerCase().replace(/[\s-]+/g, '_').replace('shortanswer', 'short_answer')
        : v,
    z.enum(['mcq', 'short_answer', 'scenario']),
  ),
  prompt: z.object({ en: z.string(), ar: z.string() }),
  choices: z.array(z.object({ en: z.string(), ar: z.string() })).optional(),
  answer: flexString,
  rubric: flexString.optional(),
  difficulty: z.preprocess(
    (v) => (typeof v === 'string' ? v.toLowerCase() : v),
    z.enum(['easy', 'medium', 'hard']),
  ),
  objective: z.string(),
})

export type AssessmentOutput = {
  items: z.infer<typeof ItemSchema>[]
}

const SYSTEM = `You are an assessment author for accounting students. Generate exactly:
- 5 MCQ items (4 choices each, exactly one correct)
- 2 short-answer items (with model answer + rubric)
- 1 scenario item (multi-step, with rubric)

Each item must:
- Map to ONE of the supplied learning objectives
- Be available in BOTH English and Arabic
- Use ONLY facts present in the lesson body
- Be answerable without external knowledge

Output STRICT JSON matching this TypeScript:
{ items: { type, prompt: {en,ar}, choices?: {en,ar}[], answer, rubric?, difficulty, objective }[] }
For MCQ items, "answer" is the EN text of the correct choice. No commentary outside the JSON.`

export const buildGenerateAssessmentTool = (
  cache: ArtifactCache,
): Tool<z.infer<typeof Input>, AssessmentOutput> => ({
  name: 'generate_assessment',
  description() {
    return 'Generate the assessment item bank for the lesson: 5 MCQs, 2 short answer, 1 scenario, all bilingual.'
  },
  inputSchema: Input,
  isReadOnly: () => true,
  async call(input, ctx) {
    const cached = await cache.get<AssessmentOutput>('assessment.json')
    if (cached) {
      ctx.onProgress?.({ tool: this.name, message: 'cache hit' })
      return { ok: true, output: cached }
    }
    try {
      const res = await azureOpenAI().chat.completions.create({
        model: 'placeholder',
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `Lesson: ${input.title}\n\nLearning objectives:\n${input.learningObjectives.map((o) => `- ${o}`).join('\n')}\n\nEN body:\n${input.mdxEn}\n\nAR body:\n${input.mdxAr}\n\nReturn only the JSON object.`,
          },
        ],
        response_format: { type: 'json_object' },
      })
      const text = res.choices[0]?.message.content ?? '{}'
      const parsed = JSON.parse(text)
      const items = z.array(ItemSchema).parse(parsed.items)
      const out: AssessmentOutput = { items }
      await cache.set('assessment.json', out)
      return {
        ok: true,
        output: out,
        usage: {
          tokensIn: res.usage?.prompt_tokens,
          tokensOut: res.usage?.completion_tokens,
        },
      }
    } catch (err) {
      return { ok: false, error: (err as Error).message, retryable: true }
    }
  },
})
