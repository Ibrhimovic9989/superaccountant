import { embed } from '@sa/ai'
import { z } from 'zod'
import type { Tool } from '../../../agent/tool'
import type {
  CurriculumSearchPort,
  LessonChunkHit,
  Locale,
  MarketTrack,
} from '../../../domain/session'

const Input = z.object({
  query: z
    .string()
    .min(3)
    .describe('A precise question or topic phrase. Be specific — vague queries return weak hits.'),
  limit: z.number().int().min(1).max(8).default(5),
})

export type SearchOutput = { hits: LessonChunkHit[] }

/**
 * RAG entry point. Embeds the query with text-embedding-3-small-2 and runs
 * cosine similarity over CurriculumLessonChunk via pgvector.
 *
 * Locale is taken from the session context, NOT model input — students can't
 * accidentally retrieve the wrong-language content.
 */
export const buildSearchCurriculumTool = (
  search: CurriculumSearchPort,
  ctxFixed: { market: MarketTrack; locale: Locale },
): Tool<z.infer<typeof Input>, SearchOutput> => ({
  name: 'search_curriculum',
  description() {
    return "Search the SuperAccountant curriculum by semantic similarity. Returns the most relevant lesson sections in the student's locale. Always call this BEFORE answering a domain question."
  },
  inputSchema: Input,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async call(input) {
    try {
      const [vec] = await embed(input.query)
      if (!vec) return { ok: false, error: 'embedding failed', retryable: true }
      const hits = await search.searchByEmbedding({
        market: ctxFixed.market,
        locale: ctxFixed.locale,
        queryEmbedding: vec,
        limit: input.limit,
      })
      return { ok: true, output: { hits } }
    } catch (err) {
      return { ok: false, error: (err as Error).message, retryable: true }
    }
  },
})
