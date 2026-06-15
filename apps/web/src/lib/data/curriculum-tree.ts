/**
 * Curriculum tree loader for the lesson-page sidebar.
 *
 * Pulls every Phase → Module → Lesson for the user's preferred market
 * in one round-trip and joins their LearningProgress so the sidebar
 * can mark completed lessons with a green dot.
 *
 * Cached at the React level for the request — the lesson page hits
 * this in parallel with getLessonBySlug, both inside server components.
 */

import { prisma } from '@sa/db'
import { cache } from 'react'

export type SidebarLesson = {
  id: string
  slug: string
  titleEn: string
  titleAr: string
  order: number
  /** mastery >= 0.8 counts as completed (matches the SA-points threshold). */
  completed: boolean
  /** mastery 0..1 — for the partial-dot rendering on near-complete rows. */
  mastery: number
}

export type SidebarModule = {
  id: string
  titleEn: string
  titleAr: string
  order: number
  lessons: SidebarLesson[]
}

export type SidebarPhase = {
  id: string
  titleEn: string
  titleAr: string
  order: number
  modules: SidebarModule[]
}

export type CurriculumTree = {
  market: 'india' | 'ksa'
  trackTitleEn: string
  trackTitleAr: string
  phases: SidebarPhase[]
}

const COMPLETION_THRESHOLD = 0.8

export const getCurriculumTree = cache(
  async (market: 'india' | 'ksa', userId: string): Promise<CurriculumTree | null> => {
    const track = await prisma.curriculumTrack.findUnique({
      where: { market },
      include: {
        phases: {
          orderBy: { order: 'asc' },
          include: {
            modules: {
              orderBy: { order: 'asc' },
              include: {
                lessons: {
                  orderBy: { order: 'asc' },
                  select: {
                    id: true,
                    slug: true,
                    titleEn: true,
                    titleAr: true,
                    order: true,
                  },
                },
              },
            },
          },
        },
      },
    })
    if (!track) return null

    // Mastery rows for this user across the whole track. Going via a
    // single enrollment per market is the standard pattern in the app.
    // If the user has no enrollment yet, everything renders as "not
    // started" — fine.
    const enrollment = await prisma.learningEnrollment.findFirst({
      where: { userId, trackId: track.id },
      include: { progress: { select: { lessonId: true, mastery: true } } },
    })
    const masteryByLesson = new Map<string, number>()
    for (const row of enrollment?.progress ?? []) {
      masteryByLesson.set(row.lessonId, row.mastery)
    }

    return {
      market,
      trackTitleEn: track.titleEn,
      trackTitleAr: track.titleAr,
      phases: track.phases.map((phase) => ({
        id: phase.id,
        titleEn: phase.titleEn,
        titleAr: phase.titleAr,
        order: phase.order,
        modules: phase.modules.map((mod) => ({
          id: mod.id,
          titleEn: mod.titleEn,
          titleAr: mod.titleAr,
          order: mod.order,
          lessons: mod.lessons.map((lesson) => {
            const mastery = masteryByLesson.get(lesson.id) ?? 0
            return {
              id: lesson.id,
              slug: lesson.slug,
              titleEn: lesson.titleEn,
              titleAr: lesson.titleAr,
              order: lesson.order,
              mastery,
              completed: mastery >= COMPLETION_THRESHOLD,
            }
          }),
        })),
      })),
    }
  },
)
