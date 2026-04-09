/**
 * Domain entity. No framework imports.
 * Per CLAUDE.md §3.3 — domain layer is pure.
 */
export type Locale = 'en' | 'ar'
export type MarketTrack = 'india' | 'ksa'

export type LessonChunk = {
  locale: Locale
  heading: string
  body: string
  embedding: number[] // 1536-d
}

export type LessonAssessmentItem = {
  type: 'mcq' | 'short_answer' | 'scenario'
  prompt: { en: string; ar: string }
  choices?: { en: string; ar: string }[]
  answer: string
  rubric?: string
  difficulty: 'easy' | 'medium' | 'hard'
  objective: string
}

export type Lesson = {
  slug: string
  market: MarketTrack
  module: string
  trackCode?: string
  phase: number
  title: { en: string; ar: string }
  contentMdx: { en: string; ar: string }
  learningObjectives: string[]
  flowchartMermaid?: string
  mindmapMermaid?: string
  videoUrl?: { en?: string; ar?: string }
  assessmentItems: LessonAssessmentItem[]
  chunks: LessonChunk[]
}

export interface LessonRepository {
  upsert(lesson: Lesson): Promise<{ id: string }>
}
