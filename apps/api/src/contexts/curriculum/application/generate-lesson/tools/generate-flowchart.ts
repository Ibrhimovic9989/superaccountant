import { z } from 'zod'
import { azureOpenAI } from '@sa/ai'
import type { Tool } from '../../../../tutoring/agent/tool'
import type { ArtifactCache } from '../artifact-cache'

const Input = z.object({
  mdxEn: z.string().min(50),
  title: z.string(),
})

export type FlowchartOutput = { mermaid: string }

const SYSTEM = `You produce Mermaid flowcharts for accounting lessons.

Output ONLY a valid Mermaid \`flowchart LR\` block. No fences, no commentary, no markdown.

CRITICAL syntax rules — violating these breaks rendering:
1. NEVER use parentheses inside node labels unless the entire label is wrapped in double quotes.
   WRONG: A[IFRS Framework (KSA/SOCPA)]
   RIGHT: A["IFRS Framework (KSA/SOCPA)"]
2. NEVER use HTML tags (<br/>, <br>, <i>, etc.) — use spaces or quoted labels with \\n.
   WRONG: A[Tally<br/>Prime]
   RIGHT: A["Tally Prime"]
3. NEVER use slashes, colons, ampersands, percent signs, or commas inside an unquoted label.
   WRONG: A[GST: 18%]
   RIGHT: A["GST: 18%"]
4. Use ASCII arrows only: -->, ---, -.-, ==>. NEVER em-dash (—>) or unicode arrows.
5. Edge labels go inside pipes: A -->|text| B  — no parens or HTML in edge labels either.
6. Keep it under 15 nodes. Use short, plain English labels.

Example of a valid flowchart:
flowchart LR
    A["Source Document"] --> B["Journal Entry"]
    B --> C["Ledger"]
    C --> D["Trial Balance"]
    D --> E["Financial Statements"]`

export const buildGenerateFlowchartTool = (
  cache: ArtifactCache,
): Tool<z.infer<typeof Input>, FlowchartOutput> => ({
  name: 'generate_flowchart',
  description() {
    return 'Produce a Mermaid flowchart that visualises the lesson\'s main process. Returns a single mermaid block.'
  },
  inputSchema: Input,
  isReadOnly: () => true,
  async call(input, ctx) {
    const cached = await cache.get<FlowchartOutput>('flowchart.json')
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
            content: `Lesson: ${input.title}\n\n${input.mdxEn}\n\nReturn only the Mermaid flowchart.`,
          },
        ],
      })
      const mermaid = stripFences(res.choices[0]?.message.content ?? '')
      if (!mermaid.startsWith('flowchart')) {
        return { ok: false, error: `invalid mermaid: ${mermaid.slice(0, 80)}`, retryable: true }
      }
      const out = { mermaid }
      await cache.set('flowchart.json', out)
      await cache.writeText('flowchart.mmd', mermaid)
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
