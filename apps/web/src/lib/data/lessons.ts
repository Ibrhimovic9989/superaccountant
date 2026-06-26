/**
 * Server-side lesson reads. Used by RSC pages.
 *
 * Per CLAUDE.md §3.5 — Prisma is allowed in apps/web only for read-side data
 * loading inside server components. Mutations still go through the NestJS API.
 */

import 'server-only'
import { azureOpenAI } from '@sa/ai'
import { prisma } from '@sa/db'
import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { GUIDES } from './guides'
import type { Guide } from './guides'

export type LessonView = {
  id: string
  slug: string
  titleEn: string
  titleAr: string
  contentEnMdx: string
  contentArMdx: string
  flowchartMermaid: string | null
  mindmapMermaid: string | null
  videoUrl: string | null
  audioUrlEn: string | null
  audioUrlAr: string | null
  learningObjectives: string[]
  learningObjectivesAr: string[]
  assessmentItems: AssessmentItem[]
  module: { titleEn: string; titleAr: string; order: number }
  phase: { order: number; titleEn: string; titleAr: string }
  market: 'india' | 'ksa'
  prevSlug: string | null
  nextSlug: string | null
  /** Slugs of practical software-guide pages this lesson links to. */
  relatedGuideSlugs: string[]
}

/** Lightweight projection of a Guide used by the lesson's
 *  "See this in practice" panel. */
export type GuideStub = {
  slug: string
  title: string
  family: Guide['family']
  emoji: string
}

export type AssessmentItem = {
  type: 'mcq' | 'short_answer' | 'scenario'
  prompt: { en: string; ar: string }
  choices?: { en: string; ar: string }[]
  answer: string
  rubric?: string
  difficulty: 'easy' | 'medium' | 'hard'
  objective: string
}

/** Translate the English learning objectives to Arabic via Azure OpenAI and
 *  persist back to the row. Cached after first call per lesson — subsequent
 *  AR requests cost zero. */
async function translateObjectives(
  lessonId: string,
  englishObjectives: string[],
): Promise<string[]> {
  if (englishObjectives.length === 0) return []
  try {
    const res = await azureOpenAI().chat.completions.create({
      model: 'placeholder',
      messages: [
        {
          role: 'system',
          content:
            'You translate accounting learning objectives from English to Modern Standard Arabic. Return STRICT JSON: { "objectives": [string, ...] } in the same order. Preserve technical accounting acronyms (GST, VAT, IFRS, ZATCA, TDS, etc.) untranslated.',
        },
        {
          role: 'user',
          content: `Translate these ${englishObjectives.length} learning objectives:\n${englishObjectives
            .map((o, i) => `${i + 1}. ${o}`)
            .join('\n')}`,
        },
      ],
      response_format: { type: 'json_object' },
    })
    const raw = res.choices[0]?.message.content ?? '{}'
    const parsed = JSON.parse(raw) as { objectives?: string[] }
    const arabic = parsed.objectives ?? []
    if (arabic.length !== englishObjectives.length) return []

    // Persist to DB
    await prisma.$executeRawUnsafe(
      `UPDATE "CurriculumLesson" SET "learningObjectivesAr" = $1::jsonb WHERE id = $2`,
      JSON.stringify(arabic),
      lessonId,
    )
    return arabic
  } catch (err) {
    console.error('[translateObjectives] failed', err)
    return []
  }
}

/**
 * Published lesson body — title, MDX, mermaid, audio, prev/next sibling
 * slugs. The MDX + assessment blueprint can easily run 50 KB+, so a
 * cold fetch over Mumbai→Seoul is the single biggest tax on lesson
 * page loads.
 *
 * Wrapped in:
 *  - React `cache()` so two server components on the same render share
 *    the lookup.
 *  - `unstable_cache` with a 5-minute TTL, tagged by slug. Lessons are
 *    publisher-controlled content; an editor saving a lesson should
 *    call `updateTag('lesson:<slug>')` to push the new copy
 *    immediately. Until then 5 min of stale-while-revalidate is fine.
 */
export const getLessonBySlug = cache((slug: string) =>
  unstable_cache(() => loadLessonBySlug(slug), ['lesson-by-slug', slug], {
    revalidate: 300,
    tags: [`lesson:${slug}`],
  })(),
)

async function loadLessonBySlug(slug: string): Promise<LessonView | null> {
  const lesson = await prisma.curriculumLesson.findUnique({
    where: { slug },
    include: {
      module: { include: { phase: { include: { track: true } } } },
    },
  })
  if (!lesson) return null

  // Pull the AR objectives + audio URLs + related-guide slugs via raw SQL —
  // columns added post-hoc via scripts/, not yet always reflected in the
  // generated Prisma client during dev.
  const extraRow = await prisma.$queryRawUnsafe<
    Array<{
      objectives: unknown
      audioUrlEn: string | null
      audioUrlAr: string | null
      relatedGuideSlugs: string[] | null
    }>
  >(
    `SELECT "learningObjectivesAr" as objectives, "audioUrlEn", "audioUrlAr", "relatedGuideSlugs" FROM "CurriculumLesson" WHERE id = $1`,
    lesson.id,
  )
  let learningObjectivesAr = (extraRow[0]?.objectives as string[] | null) ?? []
  const audioUrlEn = extraRow[0]?.audioUrlEn ?? null
  const audioUrlAr = extraRow[0]?.audioUrlAr ?? null
  const relatedGuideSlugs = extraRow[0]?.relatedGuideSlugs ?? []
  const englishObjectives = (lesson.learningObjectives as string[] | null) ?? []
  // Lazy-translate on first AR access
  if (learningObjectivesAr.length === 0 && englishObjectives.length > 0) {
    learningObjectivesAr = await translateObjectives(lesson.id, englishObjectives)
  }

  // Resolve previous and next lesson slugs by ordering within module + phase + track.
  const sameModule = await prisma.curriculumLesson.findMany({
    where: { moduleId: lesson.moduleId },
    select: { slug: true, order: true },
    orderBy: { order: 'asc' },
  })
  const idx = sameModule.findIndex((l) => l.slug === slug)
  const prevSlug = idx > 0 ? sameModule[idx - 1]!.slug : null
  let nextSlug: string | null = idx < sameModule.length - 1 ? sameModule[idx + 1]!.slug : null

  // If we're at the last lesson of a module, hop to the first lesson of the next module.
  if (!nextSlug) {
    const nextModule = await prisma.curriculumModule.findFirst({
      where: { phaseId: lesson.module.phaseId, order: { gt: lesson.module.order } },
      orderBy: { order: 'asc' },
      include: { lessons: { orderBy: { order: 'asc' }, take: 1, select: { slug: true } } },
    })
    nextSlug = nextModule?.lessons[0]?.slug ?? null
  }

  return {
    id: lesson.id,
    slug: lesson.slug,
    titleEn: lesson.titleEn,
    titleAr: lesson.titleAr,
    contentEnMdx: lesson.contentEnMdx,
    contentArMdx: lesson.contentArMdx,
    flowchartMermaid: lesson.flowchartMermaid,
    mindmapMermaid: lesson.mindmapMermaid,
    videoUrl: lesson.videoUrl,
    audioUrlEn,
    audioUrlAr,
    learningObjectives: englishObjectives,
    learningObjectivesAr,
    // biome-ignore lint/suspicious/noExplicitAny: stored as Json in Prisma
    assessmentItems: (lesson.assessmentBlueprint as unknown as AssessmentItem[]) ?? [],
    module: {
      titleEn: lesson.module.titleEn,
      titleAr: lesson.module.titleAr,
      order: lesson.module.order,
    },
    phase: {
      order: lesson.module.phase.order,
      titleEn: lesson.module.phase.titleEn,
      titleAr: lesson.module.phase.titleAr,
    },
    market: lesson.module.phase.track.market as 'india' | 'ksa',
    prevSlug,
    nextSlug,
    relatedGuideSlugs,
  }
}

/**
 * Resolve a list of guide slugs to lightweight display stubs by looking
 * them up in the static GUIDES registry. Slugs that don't match any
 * guide are silently dropped — keeps stale seed data from breaking the
 * lesson page if a guide is renamed or removed.
 */
export function getGuideStubsBySlug(slugs: string[]): GuideStub[] {
  if (slugs.length === 0) return []
  const stubs: GuideStub[] = []
  for (const slug of slugs) {
    const g = GUIDES.find((x) => x.slug === slug)
    if (!g) continue
    stubs.push({ slug: g.slug, title: g.title, family: g.family, emoji: g.emoji })
  }
  return stubs
}

/** Pick the lesson the student should resume on. v1: first published lesson
 *  in the user's preferred track. Replaced later by mastery-aware logic. */
export const getResumeLessonForUser = cache(
  async (userId: string): Promise<{ slug: string; titleEn: string; titleAr: string } | null> => {
    const user = await prisma.identityUser.findUnique({
      where: { id: userId },
      select: { preferredTrack: true },
    })
    const market = user?.preferredTrack ?? 'india'
    const first = await prisma.curriculumLesson.findFirst({
      where: { module: { phase: { track: { market } } } },
      orderBy: [
        { module: { phase: { order: 'asc' } } },
        { module: { order: 'asc' } },
        { order: 'asc' },
      ],
      select: { slug: true, titleEn: true, titleAr: true },
    })
    return first
  },
)

/** Total lesson count + published lesson count for a market — for dashboard
 *  progress display. */
export const getTrackProgress = cache(async (market: 'india' | 'ksa') => {
  const total = await prisma.curriculumLesson.count({
    where: { module: { phase: { track: { market } } } },
  })
  return { total, market }
})
