import { azureOpenAI } from '@sa/ai'
import { z } from 'zod'
import type { Tool } from '../../../agent/tool'
import type { Locale } from '../../../domain/session'

const Input = z.object({
  question: z.string(),
  studentAnswer: z.string(),
  modelAnswer: z
    .string()
    .optional()
    .describe(
      'If the question came from generate_practice_question, pass the model answer here. If the question is open-ended and you do not have a reference answer, provide a brief internal rubric in the `rubric` field instead so grading has ground truth.',
    ),
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
    ? `أنت مدرس محاسبة. قيّم إجابة الطالب بعدل.

أعد JSON خالص فقط (لا نص خارج JSON، لا ترميز markdown):
{
  "score": number (من 0 إلى 1),
  "verdict": "correct" أو "partial" أو "incorrect",
  "feedback": نص بالعربية الفصحى يشرح بالضبط ما كان صحيحاً وما كان خاطئاً،
  "whatToReview": نص اختياري يقترح موضوعاً للمراجعة
}

إرشادات التقييم:
- إذا لم تكن هناك إجابة نموذجية، قيّم الإجابة بناءً على المعرفة المحاسبية الأساسية.
- "correct" (0.85-1.0) إذا كانت الإجابة صحيحة جوهرياً.
- "partial" (0.3-0.84) إذا كانت الإجابة تحتوي على بعض العناصر الصحيحة أو ناقصة.
- "incorrect" (0-0.29) إذا كانت الإجابة خاطئة أو غير ذات صلة أو مجرد تكرار للسؤال.
- كن محدداً في ملاحظاتك — اذكر بالضبط ما الذي يجب إضافته أو إصلاحه.`
    : `You are an accounting tutor. Grade the student's answer fairly.

Return PURE JSON only (no text before or after, no markdown code fences):
{
  "score": number (0 to 1),
  "verdict": "correct" | "partial" | "incorrect",
  "feedback": specific text citing what was right and wrong,
  "whatToReview": optional topic suggestion for review
}

Grading guidance:
- If no model answer is provided, grade against standard accounting knowledge.
- "correct" (0.85–1.0) if substantively right.
- "partial" (0.3–0.84) if some right elements, incomplete, or missing required parts.
- "incorrect" (0–0.29) if wrong, irrelevant, or merely restates the question without answering it.
- A student answer that just repeats the question prompt ("because it's X" when asked "why is it X") is INCORRECT — score 0.05 with clear feedback that no reason was given.
- Be specific. Cite exactly what was missing or what to add.`

const Output = z.object({
  score: z.number(),
  verdict: z.string(),
  feedback: z.string(),
  whatToReview: z.string().optional(),
})

/** Strip markdown fences + extract JSON from a possibly-messy LLM response. */
function extractJson(raw: string): string {
  if (!raw) return '{}'
  let s = raw.trim()
  // Remove ```json ... ``` or ``` ... ``` fences
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(s)
  if (fence?.[1]) s = fence[1].trim()
  // If the response has leading/trailing prose, extract the first {...} block
  const firstBrace = s.indexOf('{')
  const lastBrace = s.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1)
  }
  return s
}

/** Normalize + clamp the parsed assessment into our strict output shape. */
function normalize(raw: z.infer<typeof Output>): AssessOutput {
  const score = Math.max(0, Math.min(1, Number(raw.score) || 0))
  const v = String(raw.verdict ?? '')
    .toLowerCase()
    .trim()
  let verdict: AssessOutput['verdict'] = 'incorrect'
  if (v === 'correct' || v === 'right' || v === 'yes') verdict = 'correct'
  else if (v === 'partial' || v === 'partially' || v === 'partly') verdict = 'partial'
  else if (v === 'incorrect' || v === 'wrong' || v === 'no') verdict = 'incorrect'
  // Auto-pick verdict from score if the string is weird
  else if (score >= 0.85) verdict = 'correct'
  else if (score >= 0.3) verdict = 'partial'
  else verdict = 'incorrect'
  return {
    score,
    verdict,
    feedback: String(raw.feedback ?? ''),
    whatToReview: raw.whatToReview ? String(raw.whatToReview) : undefined,
  }
}

/** Heuristic fallback for when the LLM grading fails — catches the common
 *  "student just repeated the question" case without another API call. */
function heuristicGrade(question: string, studentAnswer: string, locale: Locale): AssessOutput {
  const q = question.toLowerCase().trim()
  const a = studentAnswer.toLowerCase().trim()
  // Extract the meaningful phrase from "why is X called Y" — the Y part.
  const words = new Set(q.split(/\W+/).filter((w) => w.length > 3))
  const answerWords = new Set(a.split(/\W+/).filter((w) => w.length > 3))
  const overlap = [...answerWords].filter((w) => words.has(w)).length
  const answerIsShort = a.length < 30
  const answerIsMostlyQuestion = answerWords.size > 0 && overlap / answerWords.size > 0.7

  if (answerIsShort && answerIsMostlyQuestion) {
    return {
      score: 0.05,
      verdict: 'incorrect',
      feedback:
        locale === 'ar'
          ? 'إجابتك تعيد صياغة السؤال دون تقديم أسباب فعلية. يطلب السؤال منك ذكر أسباب محددة — ليس تكرار المصطلح. حاول شرح *لماذا* يحمل الدور هذا الاسم.'
          : 'Your answer restates the question without giving actual reasons. The question asks you to state specific reasons — not repeat the term. Try explaining *why* the role has that name.',
      whatToReview:
        locale === 'ar'
          ? 'الفصل الأول — لماذا تُسمى المحاسبة لغة الأعمال'
          : 'Chapter 1 — Why accounting is called the language of business',
    }
  }
  return {
    score: 0.3,
    verdict: 'partial',
    feedback:
      locale === 'ar'
        ? 'لم أتمكن من التقييم التلقائي. يرجى التفصيل في إجابتك أو إعادة صياغتها.'
        : "I couldn't auto-grade this. Please elaborate on your answer or rephrase.",
  }
}

export const buildAssessAnswerTool = (ctxFixed: { locale: Locale }): Tool<
  z.infer<typeof Input>,
  AssessOutput
> => ({
  name: 'assess_answer',
  description() {
    return "Grade a student's answer against a question. Returns score (0..1), verdict (correct/partial/incorrect), feedback, and a review suggestion. When the question is open-ended and you do not have a reference answer, the tool will grade against general accounting knowledge — but you should provide a brief `rubric` describing what a good answer looks like if you have one."
  },
  inputSchema: Input,
  isReadOnly: () => true,
  async call(input) {
    // Try up to 2 LLM attempts before falling back to heuristic.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await azureOpenAI().chat.completions.create({
          model: 'placeholder',
          messages: [
            { role: 'system', content: systemFor(ctxFixed.locale) },
            {
              role: 'user',
              content: `Question:\n${input.question}\n\nStudent answer:\n${input.studentAnswer}${
                input.modelAnswer ? `\n\nReference answer:\n${input.modelAnswer}` : ''
              }${input.rubric ? `\n\nRubric / what a good answer looks like:\n${input.rubric}` : ''}\n\nDifficulty: ${input.difficulty}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: attempt === 0 ? 0.2 : 0, // stricter on retry
        })
        const content = res.choices[0]?.message?.content ?? ''
        if (!content.trim()) {
          if (attempt === 0) continue // retry
          break
        }
        const json = extractJson(content)
        const parsed = Output.parse(JSON.parse(json))
        return { ok: true, output: normalize(parsed) }
      } catch (err) {
        if (attempt === 0) continue // retry once
        // Fall through to heuristic after second failure
        // eslint-disable-next-line no-console
        console.warn('[assess_answer] LLM grading failed after retry:', (err as Error).message)
      }
    }

    // Final fallback: heuristic grade. Better than erroring out the whole turn.
    return {
      ok: true,
      output: heuristicGrade(input.question, input.studentAnswer, ctxFixed.locale),
    }
  },
})
