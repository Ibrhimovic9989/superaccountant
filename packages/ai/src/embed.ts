/**
 * Provider-agnostic embedding shim.
 *
 * Single backend right now: Jina AI v3 (`jina-embeddings-v3`). 1024-d
 * vectors via the MRL-aware `dimensions` truncation parameter — this
 * is the dim we ALTER our pgvector columns to.
 *
 * Why 1024 over 1536: cuts pgvector storage + the indexing memory
 * cost by ~33% and Jina's MRL training preserves >98% retrieval
 * quality on retrieval-passage at this dim. We lose nothing the
 * existing Azure-1536-d embeddings were giving us in practice.
 *
 * Task hint: pass `kind: 'query'` when embedding the user's question
 * and `kind: 'passage'` when embedding lesson chunks. Jina v3 is task-
 * conditioned; mixing the two hurts retrieval quality. Default is
 * 'passage' since that's the high-volume path (ingestion).
 *
 * Perplexity is NOT an embedding provider — the earlier ask to use it
 * as a fallback was based on a misread of their API surface. There
 * is no fallback today; if Jina is down, embedding-dependent paths
 * (RAG, semantic search) return an empty result and the agent falls
 * back to non-grounded reasoning.
 */

const JINA_URL = 'https://api.jina.ai/v1/embeddings'

/** Output dimension. pgvector columns are typed against this constant. */
export const EMBEDDING_DIMS = 1024

export type EmbedKind = 'passage' | 'query'

type JinaInputItem = string | { text: string }

type JinaRequest = {
  model: 'jina-embeddings-v3'
  input: JinaInputItem[]
  dimensions: number
  task: 'retrieval.passage' | 'retrieval.query'
  /** Jina recommends 'truncate' for documents > token window. */
  late_chunking?: boolean
  /** Normalise so cosine-sim == dot-product downstream. */
  normalized?: boolean
}

type JinaResponse = {
  data: Array<{ embedding: number[]; index: number }>
  usage?: { total_tokens?: number; prompt_tokens?: number }
}

function taskFor(kind: EmbedKind): JinaRequest['task'] {
  return kind === 'query' ? 'retrieval.query' : 'retrieval.passage'
}

async function callJina(input: string[], kind: EmbedKind): Promise<number[][]> {
  const key = process.env.JINA_API_KEY
  if (!key) throw new Error('JINA_API_KEY is not set')

  const body: JinaRequest = {
    model: 'jina-embeddings-v3',
    input: input.map((text) => ({ text })),
    dimensions: EMBEDDING_DIMS,
    task: taskFor(kind),
    normalized: true,
  }

  const res = await fetch(JINA_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Jina ${res.status}: ${text.slice(0, 400)}`)
  }
  const json = (await res.json()) as JinaResponse
  // Jina returns items in request order with `index`; sort defensively
  // so the caller's input[i] aligns with result[i] regardless of
  // upstream ordering quirks.
  const sorted = [...json.data].sort((a, b) => a.index - b.index)
  return sorted.map((d) => d.embedding)
}

/**
 * Embed one or many strings. Returns vectors of length EMBEDDING_DIMS.
 * Backwards-compatible with the previous Azure-based `embed(input)`
 * signature so the existing callsites work unchanged.
 */
export async function embed(
  input: string | string[],
  opts: { kind?: EmbedKind } = {},
): Promise<number[][]> {
  const arr = Array.isArray(input) ? input : [input]
  if (arr.length === 0) return []
  return callJina(arr, opts.kind ?? 'passage')
}
