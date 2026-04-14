import { z } from 'zod'
import { prisma } from '@sa/db'
import { embed } from '@sa/ai'
import type { Tool } from '../../../agent/tool'
import type { MarketTrack } from '../../../domain/session'

/**
 * Search the primary-source statute corpus — tax acts, GST regulations,
 * ZATCA bylaws, Companies Act, Zakat regulations.
 *
 * Use this when the student asks a regulatory or compliance question that
 * needs an exact section citation. The tool returns passages from the
 * actual legislation (section number, title, full text), so the tutor
 * answers with "Section 194J of the Income Tax Act says..." instead of
 * paraphrased curriculum content.
 *
 * Complement to search_curriculum — that tool returns teaching material
 * from lessons; this tool returns the law itself.
 */

const Input = z.object({
  query: z
    .string()
    .describe(
      'Natural-language query. Works best with a specific topic + concrete context, e.g. "TDS rate on professional fees" or "input credit on motor vehicles for car dealers".',
    ),
  limit: z.number().int().min(1).max(10).default(5),
})

export type StatuteHit = {
  source: string
  sourceShort: string
  sectionCode: string
  sectionTitle: string
  content: string
  score: number // 0..1, higher = closer match
  jurisdiction: 'india' | 'ksa'
  sourceUrl: string | null
}

export const buildSearchStatutesTool = (ctxFixed: {
  market: MarketTrack
}): Tool<z.infer<typeof Input>, { hits: StatuteHit[] }> => ({
  name: 'search_statutes',
  description() {
    return 'Search primary-source tax law, GST/VAT regulations, and corporate law for the active jurisdiction. Returns exact section text with the section code. Call this when the student asks about a regulatory rule, rate, due date, threshold, or compliance requirement. Always call this before citing a specific section — do not guess section numbers.'
  },
  inputSchema: Input,
  isReadOnly: () => true,
  async call(input) {
    try {
      const [vec] = await embed(input.query.trim())
      if (!vec) return { ok: false as const, error: 'embedding failed', retryable: true }

      const vectorLiteral = `[${vec.join(',')}]`
      const rows = await prisma.$queryRawUnsafe<
        Array<{
          source: string
          sourceShort: string
          sectionCode: string
          sectionTitle: string
          content: string
          distance: number
          jurisdiction: string
          sourceUrl: string | null
        }>
      >(
        `SELECT
           source, "sourceShort", "sectionCode", "sectionTitle", content,
           (embedding <=> $1::vector) AS distance,
           jurisdiction, "sourceUrl"
         FROM "StatuteChunk"
         WHERE jurisdiction = $2
         ORDER BY embedding <=> $1::vector
         LIMIT $3`,
        vectorLiteral,
        ctxFixed.market,
        input.limit,
      )

      const hits: StatuteHit[] = rows.map((r) => ({
        source: r.source,
        sourceShort: r.sourceShort,
        sectionCode: r.sectionCode,
        sectionTitle: r.sectionTitle,
        content: r.content,
        score: Math.max(0, 1 - r.distance),
        jurisdiction: r.jurisdiction as 'india' | 'ksa',
        sourceUrl: r.sourceUrl,
      }))

      return { ok: true as const, output: { hits } }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message, retryable: true }
    }
  },
})
