import { z } from 'zod'
import { azureOpenAI } from '@sa/ai'
import type { Tool } from '../../../../tutoring/agent/tool'
import type { ArtifactCache } from '../artifact-cache'

const Input = z.object({
  mdxEn: z.string().min(50),
  market: z.enum(['india', 'ksa']),
})

export type TranslateOutput = { mdxAr: string }

const SYSTEM = `You are a professional accounting translator. Translate the supplied English MDX lesson into formal Modern Standard Arabic suitable for accounting students. Preserve:
- All MDX structure (## headings, lists, code, tables)
- All numeric values, section numbers, and English acronyms (GST, VAT, ZATCA, IFRS) — Arabic readers expect them
- Citations and URLs unchanged
Use precise accounting terminology. Output only the translated MDX, nothing else.`

export const buildTranslateLessonTool = (
  cache: ArtifactCache,
): Tool<z.infer<typeof Input>, TranslateOutput> => ({
  name: 'translate_lesson',
  description() {
    return 'Translate the EN MDX lesson body to Modern Standard Arabic. Preserves all MDX structure and accounting acronyms.'
  },
  inputSchema: Input,
  isReadOnly: () => true,
  async call(input, ctx) {
    const cached = await cache.get<TranslateOutput>('translate.json')
    if (cached) {
      ctx.onProgress?.({ tool: this.name, message: 'cache hit' })
      return { ok: true, output: cached }
    }

    try {
      const res = await azureOpenAI().chat.completions.create({
        model: 'placeholder',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: input.mdxEn },
        ],
      })
      const mdxAr = res.choices[0]?.message.content?.trim() ?? ''
      if (!mdxAr) return { ok: false, error: 'empty translation', retryable: true }
      const out = { mdxAr }
      await cache.set('translate.json', out)
      await cache.writeText('ar.mdx', mdxAr)
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
