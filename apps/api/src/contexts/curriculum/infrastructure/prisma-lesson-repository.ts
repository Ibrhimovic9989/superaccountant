/**
 * Prisma + raw SQL implementation of LessonRepository.
 *
 * pgvector columns are managed via raw SQL because Prisma cannot model the
 * vector type natively. The migration in packages/db/prisma/migrations/
 * 20260407_pgvector/ creates them.
 */

import { prisma } from '@sa/db'
import type { Lesson, LessonRepository } from '../domain/lesson'

export class PrismaLessonRepository implements LessonRepository {
  async upsert(lesson: Lesson): Promise<{ id: string }> {
    // 1. Upsert the track + phase + module + lesson hierarchy.
    const track = await prisma.curriculumTrack.upsert({
      where: { market: lesson.market },
      create: {
        market: lesson.market,
        titleEn: lesson.market === 'india' ? 'Chartered Path' : "Mu'tamad Path",
        titleAr: lesson.market === 'india' ? 'المسار المعتمد' : 'مسار مُعتمَد',
      },
      update: {},
    })

    const phase = await prisma.curriculumPhase.upsert({
      where: { trackId_order: { trackId: track.id, order: lesson.phase } },
      create: {
        trackId: track.id,
        order: lesson.phase,
        titleEn: `Phase ${lesson.phase}`,
        titleAr: `المرحلة ${lesson.phase}`,
      },
      update: {},
    })

    // Module ordering is best-effort: hash module name to a stable order slot.
    // The seed pipeline will replay modules in source order so collisions resolve naturally.
    const moduleOrder = await this.deriveModuleOrder(phase.id, lesson.module)
    const moduleRow = await prisma.curriculumModule.upsert({
      where: { phaseId_order: { phaseId: phase.id, order: moduleOrder } },
      create: {
        phaseId: phase.id,
        order: moduleOrder,
        titleEn: lesson.module,
        titleAr: lesson.module, // translated module names land later
      },
      update: { titleEn: lesson.module },
    })

    // Lesson order = position among siblings; reuse if exists.
    const existing = await prisma.curriculumLesson.findUnique({ where: { slug: lesson.slug } })
    const lessonOrder =
      existing?.order ?? (await prisma.curriculumLesson.count({ where: { moduleId: moduleRow.id } })) + 1

    const upserted = await prisma.curriculumLesson.upsert({
      where: { slug: lesson.slug },
      create: {
        slug: lesson.slug,
        moduleId: moduleRow.id,
        order: lessonOrder,
        titleEn: lesson.title.en,
        titleAr: lesson.title.ar,
        contentEnMdx: lesson.contentMdx.en,
        contentArMdx: lesson.contentMdx.ar,
        learningObjectives: lesson.learningObjectives,
        flowchartMermaid: lesson.flowchartMermaid ?? null,
        mindmapMermaid: lesson.mindmapMermaid ?? null,
        videoUrl: lesson.videoUrl?.en ?? null,
        assessmentBlueprint: lesson.assessmentItems as unknown as object,
      },
      update: {
        moduleId: moduleRow.id,
        titleEn: lesson.title.en,
        titleAr: lesson.title.ar,
        contentEnMdx: lesson.contentMdx.en,
        contentArMdx: lesson.contentMdx.ar,
        learningObjectives: lesson.learningObjectives,
        flowchartMermaid: lesson.flowchartMermaid ?? null,
        mindmapMermaid: lesson.mindmapMermaid ?? null,
        videoUrl: lesson.videoUrl?.en ?? null,
        assessmentBlueprint: lesson.assessmentItems as unknown as object,
      },
    })

    // 2. Replace embedding chunks (raw SQL — pgvector).
    await prisma.$executeRawUnsafe(
      `DELETE FROM "CurriculumLessonChunk" WHERE "lessonId" = $1`,
      upserted.id,
    )
    for (const chunk of lesson.chunks) {
      const id = `${upserted.id}_${chunk.locale}_${slugify(chunk.heading)}`
      const vectorLiteral = `[${chunk.embedding.join(',')}]`
      await prisma.$executeRawUnsafe(
        `INSERT INTO "CurriculumLessonChunk" ("id","lessonId","locale","heading","body","embedding")
         VALUES ($1,$2,$3,$4,$5,$6::vector)`,
        id,
        upserted.id,
        chunk.locale,
        chunk.heading,
        chunk.body,
        vectorLiteral,
      )
    }

    return { id: upserted.id }
  }

  private async deriveModuleOrder(phaseId: string, moduleName: string): Promise<number> {
    const existing = await prisma.curriculumModule.findFirst({
      where: { phaseId, titleEn: moduleName },
    })
    if (existing) return existing.order
    const count = await prisma.curriculumModule.count({ where: { phaseId } })
    return count + 1
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}
