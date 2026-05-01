/**
 * Tutoring domain types. No framework imports.
 */
export type Locale = 'en' | 'ar'
export type MarketTrack = 'india' | 'ksa'

export type TutoringSessionContext = {
  sessionId: string
  userId: string
  locale: Locale
  market: MarketTrack
  /** Optional lesson the student is currently on. */
  currentLessonSlug?: string
  /** Optional student goal — drives lesson recommendations. */
  goal?: string
}

export type SessionMemoryEntry = {
  id: string
  sessionId: string
  kind: 'student' | 'course' | 'scratch'
  bodyMd: string
  updatedAt: Date
}

export type LessonChunkHit = {
  lessonSlug: string
  lessonTitle: string
  heading: string
  body: string
  score: number
  locale: Locale
}

export interface CurriculumSearchPort {
  searchByEmbedding(args: {
    market: MarketTrack
    locale: Locale
    queryEmbedding: number[]
    limit: number
  }): Promise<LessonChunkHit[]>
}

export interface SessionMemoryPort {
  list(sessionId: string): Promise<SessionMemoryEntry[]>
  upsert(args: {
    sessionId: string
    kind: SessionMemoryEntry['kind']
    bodyMd: string
  }): Promise<SessionMemoryEntry>
}

export interface MasteryPort {
  getMastery(userId: string, lessonSlug: string): Promise<number>
  recommendNext(args: {
    userId: string
    market: MarketTrack
  }): Promise<{ slug: string; title: string; reason: string }[]>
}

/**
 * Snapshot of student profile fields that personalize the tutor.
 * Loaded fresh per turn so edits to the profile take effect immediately.
 */
export type StudentProfile = {
  name: string | null
  examGoal: string | null
  /**
   * Career goal — drives whether the tutor leans into placement-prep tone
   * (resumes, interviews) or upskill-deepening tone (advanced topics).
   * One of: 'first-job' | 'switch-careers' | 'upskill' | 'own-business'
   * | 'exploring' (free-form text in DB; tutor reads any string).
   */
  jobGoal: string | null
  experienceYears: number | null
  currentRole: string | null
  currentEmployer: string | null
  studyHoursPerWeek: number | null
  targetExamDate: Date | null
  motivation: string | null
  country: string | null
  city: string | null
}

export interface UserProfilePort {
  getStudentProfile(userId: string): Promise<StudentProfile | null>
}
