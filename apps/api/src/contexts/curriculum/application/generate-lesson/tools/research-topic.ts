import { z } from 'zod'
import { perplexity } from '@sa/ai'
import type { Tool } from '../../../../tutoring/agent/tool'
import type { ArtifactCache } from '../artifact-cache'

const Input = z.object({
  query: z.string().min(10).describe('Specific research question. Be precise and jurisdictional.'),
  market: z.enum(['india', 'ksa']),
})

export type ResearchOutput = {
  facts: string[]
  citations: { url: string; title?: string }[]
  raw: string
}

export const buildResearchTopicTool = (cache: ArtifactCache): Tool<z.infer<typeof Input>, ResearchOutput> => ({
  name: 'research_topic',
  description() {
    return 'Research a specific topic using Perplexity. Returns cited facts. Use this BEFORE drafting any lesson content. Re-call with a more specific query if results are weak.'
  },
  inputSchema: Input,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async call(input, ctx) {
    const cached = await cache.get<ResearchOutput>('research.json')
    if (cached) {
      ctx.onProgress?.({ tool: this.name, message: 'cache hit' })
      return { ok: true, output: cached }
    }

    const jurisdiction =
      input.market === 'india'
        ? 'India (cite Companies Act 2013, Income Tax Act 1961, CGST/SGST/IGST Acts, ICAI standards, Ind AS where relevant)'
        : 'Kingdom of Saudi Arabia (cite ZATCA regulations, VAT Implementing Regulations, Zakat Bylaws, IFRS as endorsed by SOCPA, Saudi Companies Law)'

    const prompt = `For an accounting course aimed at ${jurisdiction}, research the following topic and produce:
1. A bullet list of 8-15 specific factual statements (rates, thresholds, dates, section numbers, definitions).
2. Citations to authoritative sources (regulator websites, official PDFs, legal text).

Topic: ${input.query}

Respond with the bullet list, then the citations. Keep facts current and jurisdictionally specific.`

    try {
      const res = await perplexity.ask(prompt)
      const facts = res.text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => /^[-*\d]/.test(l))
        .map((l) => l.replace(/^[-*\d.)\s]+/, '').trim())
        .filter(Boolean)

      const out: ResearchOutput = {
        facts,
        citations: res.citations,
        raw: res.text,
      }
      await cache.set('research.json', out)
      return { ok: true, output: out }
    } catch (err) {
      return { ok: false, error: (err as Error).message, retryable: true }
    }
  },
})
