import { z } from 'zod'
import type { Tool } from '../../../../tutoring/agent/tool'
import type { ArtifactCache } from '../artifact-cache'
import { PrismaLessonRepository } from '../../../infrastructure/prisma-lesson-repository'
import type { Lesson } from '../../../domain/lesson'

const Input = z.object({
  slug: z.string(),
  market: z.enum(['india', 'ksa']),
  module: z.string(),
  phase: z.number().int().min(1),
  trackCode: z.string().optional(),
  titleEn: z.string(),
  titleAr: z.string(),
  learningObjectives: z.array(z.string()).min(1),
})

export type PublishOutput = {
  slug: string
  lessonId: string
  status: 'published'
}

/**
 * Permission-gated. Reads cached artifacts (draft/translate/flowchart/mindmap/
 * assessment/embed/video) from disk and persists them via the domain repository.
 *
 * The model only needs to provide identity fields — everything else is reconstructed
 * from the artifact cache the upstream tools wrote. This keeps the model from
 * having to round-trip large MDX bodies through tool arguments.
 */
export const buildPublishLessonTool = (
  cache: ArtifactCache,
): Tool<z.infer<typeof Input>, PublishOutput> => ({
  name: 'publish_lesson',
  description() {
    return 'Persist the completed lesson to the database. Reads cached artifacts written by earlier tools — you only supply identity fields. PERMISSION-GATED. Call exactly once after every other tool has succeeded.'
  },
  inputSchema: Input,
  isReadOnly: () => false,
  async checkPermissions(input, ctx) {
    if (ctx.meta.autoApprove === true) return { behavior: 'allow' }
    return {
      behavior: 'ask',
      prompt: `Publish lesson "${input.slug}" (${input.market}/${input.module}) to the database?`,
    }
  },
  async call(input, ctx) {
    // Pull every artifact the upstream tools wrote.
    const draft = await cache.get<{ mdxEn: string; sections: { heading: string; body: string }[] }>(
      'draft.json',
    )
    const translate = await cache.get<{ mdxAr: string }>('translate.json')
    const flowchart = await cache.get<{ mermaid: string }>('flowchart.json')
    const mindmap = await cache.get<{ mermaid: string }>('mindmap.json')
    const assessment = await cache.get<{ items: Lesson['assessmentItems'] }>('assessment.json')
    const embed = await cache.get<{
      vectors: { heading: string; locale: 'en' | 'ar'; vector: number[] }[]
    }>('embed.json')
    const video = await cache.get<{ videoEnUrl: string; videoArUrl: string }>('video.json')

    const missing = [
      !draft && 'draft',
      !translate && 'translate',
      !flowchart && 'flowchart',
      !mindmap && 'mindmap',
      !assessment && 'assessment',
      !embed && 'embed',
    ].filter(Boolean)

    if (missing.length) {
      return {
        ok: false,
        error: `missing artifacts: ${missing.join(', ')}. Run upstream tools first.`,
        retryable: false,
      }
    }

    // Build chunks: each EN section + a full-AR chunk.
    const chunks: Lesson['chunks'] = []
    const enVectors = embed!.vectors.filter((v) => v.locale === 'en')
    for (const section of draft!.sections) {
      const matched = enVectors.find((v) => v.heading === section.heading)
      if (!matched) continue
      chunks.push({
        locale: 'en',
        heading: section.heading,
        body: section.body,
        embedding: matched.vector,
      })
    }
    const arFull = embed!.vectors.find((v) => v.locale === 'ar')
    if (arFull) {
      chunks.push({
        locale: 'ar',
        heading: '__full__',
        body: translate!.mdxAr,
        embedding: arFull.vector,
      })
    }

    // The assemble_video tool returns local file paths (or placeholder://...
    // when Azure Speech wasn't configured). Normalise to a streaming URL the
    // web app can serve via /api/video/{market}/{slug}/{file}. We only use
    // the local file paths to detect "real" vs "placeholder".
    const videoEnLocal =
      (video as { videoEnPath?: string; videoEnUrl?: string } | null)?.videoEnPath ??
      (video as { videoEnUrl?: string } | null)?.videoEnUrl
    const videoArLocal =
      (video as { videoArPath?: string; videoArUrl?: string } | null)?.videoArPath ??
      (video as { videoArUrl?: string } | null)?.videoArUrl
    const isRealVideo =
      !!videoEnLocal &&
      !videoEnLocal.startsWith('placeholder://') &&
      !!videoArLocal &&
      !videoArLocal.startsWith('placeholder://')
    const videoUrl: { en?: string; ar?: string } | undefined = isRealVideo
      ? {
          en: `/api/video/${input.market}/${input.slug}/en.mp4`,
          ar: `/api/video/${input.market}/${input.slug}/ar.mp4`,
        }
      : undefined

    const lesson: Lesson = {
      slug: input.slug,
      market: input.market,
      module: input.module,
      phase: input.phase,
      trackCode: input.trackCode,
      title: { en: input.titleEn, ar: input.titleAr },
      contentMdx: { en: draft!.mdxEn, ar: translate!.mdxAr },
      learningObjectives: input.learningObjectives,
      flowchartMermaid: flowchart!.mermaid,
      mindmapMermaid: mindmap!.mermaid,
      videoUrl,
      assessmentItems: assessment!.items,
      chunks,
    }

    try {
      const repo = new PrismaLessonRepository()
      const { id } = await repo.upsert(lesson)

      // Also write a manifest for inspection / debugging.
      await cache.set('manifest.json', {
        slug: input.slug,
        lessonId: id,
        publishedAt: new Date().toISOString(),
        chunkCount: chunks.length,
        assessmentItemCount: assessment!.items.length,
      })

      ctx.onProgress?.({
        tool: this.name,
        message: `published ${input.slug} → lesson id ${id} (${chunks.length} chunks, ${assessment!.items.length} items)`,
      })

      return { ok: true, output: { slug: input.slug, lessonId: id, status: 'published' } }
    } catch (err) {
      return { ok: false, error: (err as Error).message, retryable: true }
    }
  },
})
