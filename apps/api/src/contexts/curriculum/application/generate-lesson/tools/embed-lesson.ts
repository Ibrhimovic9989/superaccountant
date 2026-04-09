import { z } from 'zod'
import { embed } from '@sa/ai'
import type { Tool } from '../../../../tutoring/agent/tool'
import type { ArtifactCache } from '../artifact-cache'

const Input = z.object({
  sections: z.array(z.object({ heading: z.string(), body: z.string() })).min(1),
  mdxAr: z.string().min(1),
})

export type EmbedOutput = {
  vectors: { heading: string; locale: 'en' | 'ar'; vector: number[] }[]
}

export const buildEmbedLessonTool = (cache: ArtifactCache): Tool<z.infer<typeof Input>, EmbedOutput> => ({
  name: 'embed_lesson',
  description() {
    return 'Generate vector embeddings (text-embedding-3-small-2, 1536-d) for each lesson section in EN and one whole-lesson AR vector. These power the tutoring agent\'s RAG.'
  },
  inputSchema: Input,
  isReadOnly: () => true,
  async call(input, ctx) {
    const cached = await cache.get<EmbedOutput>('embed.json')
    if (cached) {
      ctx.onProgress?.({ tool: this.name, message: 'cache hit' })
      return { ok: true, output: cached }
    }
    try {
      const inputs = [
        ...input.sections.map((s) => `${s.heading}\n${s.body}`),
        input.mdxAr.slice(0, 8000),
      ]
      const vectors = await embed(inputs)
      const out: EmbedOutput = {
        vectors: [
          ...input.sections.map((s, i) => ({
            heading: s.heading,
            locale: 'en' as const,
            vector: vectors[i] ?? [],
          })),
          { heading: '__full_ar__', locale: 'ar' as const, vector: vectors[vectors.length - 1] ?? [] },
        ],
      }
      await cache.set('embed.json', out)
      return { ok: true, output: out }
    } catch (err) {
      return { ok: false, error: (err as Error).message, retryable: true }
    }
  },
})
