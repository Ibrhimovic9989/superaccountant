export type Locale = 'en' | 'ar'
export type MarketTrack = 'india' | 'ksa'

export type Bilingual<T = string> = { en: T; ar: T }

export type AssessmentBlueprint = {
  objectiveItems: number
  shortAnswer: number
  scenario: number
  masteryThreshold: number
  spacedRepetitionDays: number[]
}

export type LessonSeed = {
  slug: string
  title: Bilingual
  learningObjectives: Bilingual<string[]>
  contentMdx: Bilingual
  flowchartMermaid?: string
  mindmapMermaid?: string
  videoScript?: Bilingual
  assessmentBlueprint: AssessmentBlueprint
}
