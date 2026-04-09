import { z } from 'zod'
import { azureOpenAI } from '@sa/ai'
import type { Tool } from '../../../../tutoring/agent/tool'
import type { ArtifactCache } from '../artifact-cache'

const Input = z.object({
  title: z.string(),
  learningObjectives: z.array(z.string()).min(1),
  facts: z.array(z.string()).min(1).describe('Facts gathered by research_topic'),
  citations: z.array(z.object({ url: z.string(), title: z.string().optional() })),
  market: z.enum(['india', 'ksa']),
})

export type DraftOutput = {
  mdxEn: string
  sections: { heading: string; body: string }[]
}

const SYSTEM = `You are a senior accounting course author. Write clear, jurisdictionally accurate lesson content in MDX. Structure: short intro, then 3-6 sections (## headings), then a "Key takeaways" bullet list, then a "Sources" section. Keep paragraphs short. Use concrete examples. Never invent rates or section numbers — only use those from the supplied facts.`

export const buildDraftLessonTool = (cache: ArtifactCache): Tool<z.infer<typeof Input>, DraftOutput> => ({
  name: 'draft_lesson',
  description() {
    return 'Produce the English MDX lesson body from research facts. Returns structured sections plus the full MDX.'
  },
  inputSchema: Input,
  isReadOnly: () => true,
  async call(input, ctx) {
    const cached = await cache.get<DraftOutput>('draft.json')
    if (cached) {
      ctx.onProgress?.({ tool: this.name, message: 'cache hit' })
      return { ok: true, output: cached }
    }

    const userMsg = `Write a lesson titled "${input.title}" for the ${input.market.toUpperCase()} market.

Learning objectives:
${input.learningObjectives.map((o) => `- ${o}`).join('\n')}

Facts you may use (do not introduce facts beyond these):
${input.facts.map((f) => `- ${f}`).join('\n')}

Citations available:
${input.citations.map((c) => `- ${c.title ?? c.url} (${c.url})`).join('\n')}

Output ONLY valid MDX. Use ## for section headings. End with ## Key takeaways and ## Sources.`

    try {
      const res = await azureOpenAI().chat.completions.create({
        model: 'placeholder',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userMsg },
        ],
      })
      const mdx = res.choices[0]?.message.content?.trim() ?? ''
      if (!mdx) return { ok: false, error: 'empty draft', retryable: true }

      const sections = extractSections(mdx)
      const out: DraftOutput = { mdxEn: mdx, sections }
      await cache.set('draft.json', out)
      await cache.writeText('en.mdx', mdx)
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

function extractSections(mdx: string): DraftOutput['sections'] {
  const lines = mdx.split('\n')
  const sections: DraftOutput['sections'] = []
  let current: { heading: string; body: string[] } | null = null
  for (const line of lines) {
    const m = /^##\s+(.+)$/.exec(line)
    if (m) {
      if (current) sections.push({ heading: current.heading, body: current.body.join('\n').trim() })
      current = { heading: m[1] ?? '', body: [] }
    } else if (current) {
      current.body.push(line)
    }
  }
  if (current) sections.push({ heading: current.heading, body: current.body.join('\n').trim() })
  return sections
}
