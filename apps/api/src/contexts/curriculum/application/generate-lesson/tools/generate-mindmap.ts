import { z } from 'zod'
import { azureOpenAI } from '@sa/ai'
import type { Tool } from '../../../../tutoring/agent/tool'
import type { ArtifactCache } from '../artifact-cache'

const Input = z.object({
  mdxEn: z.string().min(50),
  title: z.string(),
})

export type MindmapOutput = { mermaid: string }

const SYSTEM = `You produce Mermaid mindmaps for accounting lessons.

Output ONLY a valid Mermaid \`mindmap\` block. No fences, no commentary, no markdown.

CRITICAL syntax rules:
1. NEVER use parentheses, slashes, colons, ampersands, or commas in node text unless the entire node text is wrapped in double quotes.
   WRONG: GST (CGST/SGST)
   RIGHT: "GST (CGST/SGST)"
2. NEVER use HTML tags like <br/>.
3. Use plain ASCII characters only.
4. Root the mindmap at the lesson title. Branch into 4-7 top-level concepts, each with 2-4 children. Keep labels short.

Example:
mindmap
  root((Lesson Title))
    Concept A
      Sub 1
      Sub 2
    Concept B
      "Sub with (parens)"
      Sub 3`

export const buildGenerateMindmapTool = (
  cache: ArtifactCache,
): Tool<z.infer<typeof Input>, MindmapOutput> => ({
  name: 'generate_mindmap',
  description() {
    return 'Produce a Mermaid mindmap that maps the lesson\'s key concepts hierarchically.'
  },
  inputSchema: Input,
  isReadOnly: () => true,
  async call(input, ctx) {
    const cached = await cache.get<MindmapOutput>('mindmap.json')
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
            content: `Lesson: ${input.title}\n\n${input.mdxEn}\n\nReturn only the Mermaid mindmap rooted at "${input.title}".`,
          },
        ],
      })
      const mermaid = stripFences(res.choices[0]?.message.content ?? '')
      if (!mermaid.startsWith('mindmap')) {
        return { ok: false, error: `invalid mermaid: ${mermaid.slice(0, 80)}`, retryable: true }
      }
      const out = { mermaid }
      await cache.set('mindmap.json', out)
      await cache.writeText('mindmap.mmd', mermaid)
      return { ok: true, output: out }
    } catch (err) {
      return { ok: false, error: (err as Error).message, retryable: true }
    }
  },
})

function stripFences(s: string): string {
  return s
    .trim()
    .replace(/^```(?:mermaid)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()
}
