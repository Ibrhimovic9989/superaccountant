import { prisma } from '@sa/db'
import type { MasteryPort, MarketTrack } from '../domain/session'

/**
 * Mastery + recommendation port. Mastery is stored on LearningProgress
 * keyed by (enrollment, lessonId). Recommendation is a simple "lowest mastery
 * unlocked lesson" today; the entry-test agent will replace this with adaptive
 * placement later.
 */
export class PrismaMastery implements MasteryPort {
  async getMastery(userId: string, lessonSlug: string): Promise<number> {
    const lesson = await prisma.curriculumLesson.findUnique({ where: { slug: lessonSlug } })
    if (!lesson) return 0
    const progress = await prisma.learningProgress.findFirst({
      where: { lessonId: lesson.id, enrollment: { userId } },
    })
    return progress?.mastery ?? 0
  }

  async recommendNext(args: {
    userId: string
    market: MarketTrack
  }): Promise<{ slug: string; title: string; reason: string }[]> {
    // Naive v1: lessons in the user's enrolled track ordered by phase + module + order,
    // skipping ones already at mastery >= 0.75. Returns top 5.
    const enrollment = await prisma.learningEnrollment.findFirst({
      where: { userId: args.userId, completedAt: null },
    })
    if (!enrollment) return []

    const masteredIds = new Set(
      (await prisma.learningProgress.findMany({
        where: { enrollmentId: enrollment.id, mastery: { gte: 0.75 } },
        select: { lessonId: true },
      })).map((p) => p.lessonId),
    )

    const lessons = await prisma.curriculumLesson.findMany({
      where: {
        module: { phase: { track: { market: args.market } } },
        id: { notIn: Array.from(masteredIds) },
      },
      include: { module: { include: { phase: true } } },
      orderBy: [
        { module: { phase: { order: 'asc' } } },
        { module: { order: 'asc' } },
        { order: 'asc' },
      ],
      take: 5,
    })

    return lessons.map((l) => ({
      slug: l.slug,
      title: l.titleEn,
      reason: `Phase ${l.module.phase.order}, module "${l.module.titleEn}". Not yet mastered.`,
    }))
  }
}
