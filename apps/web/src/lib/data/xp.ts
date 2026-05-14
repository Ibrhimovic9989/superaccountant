/**
 * XP + level system. Pure math — no I/O. Compose it from the existing
 * dashboard snapshot fields.
 *
 * XP sources:
 *   - completed lesson  → 100 XP
 *   - hour studied      →  20 XP
 *   - streak day        →  10 XP
 *   - achievement       →  50 XP
 *
 * Level thresholds are sub-linear so the cadence stays satisfying:
 * early levels arrive quickly, later levels take real work.
 */

export type Rank = {
  level: number
  threshold: number // cumulative XP needed to reach this level
  titleEn: string
  titleAr: string
}

const RANKS: Rank[] = [
  { level: 1, threshold: 0, titleEn: 'Initiate', titleAr: 'مبتدئ' },
  { level: 2, threshold: 500, titleEn: 'Apprentice', titleAr: 'متدرب' },
  { level: 3, threshold: 1200, titleEn: 'Bookkeeper', titleAr: 'ماسك دفاتر' },
  { level: 4, threshold: 2200, titleEn: 'Junior Accountant', titleAr: 'محاسب مبتدئ' },
  { level: 5, threshold: 3500, titleEn: 'Accountant', titleAr: 'محاسب' },
  { level: 6, threshold: 5200, titleEn: 'Senior Accountant', titleAr: 'محاسب أول' },
  { level: 7, threshold: 7500, titleEn: 'Audit Lead', titleAr: 'مدير التدقيق' },
  { level: 8, threshold: 10500, titleEn: 'Chief Accountant', titleAr: 'رئيس المحاسبين' },
  { level: 9, threshold: 14500, titleEn: 'Controller', titleAr: 'مراقب' },
  { level: 10, threshold: 20000, titleEn: 'Master', titleAr: 'خبير' },
]

export function computeXp(input: {
  completedLessons: number
  hoursStudied: number
  streakDays: number
  earnedBadges: number
}): number {
  return (
    input.completedLessons * 100 +
    Math.floor(input.hoursStudied) * 20 +
    input.streakDays * 10 +
    input.earnedBadges * 50
  )
}

export type LevelInfo = {
  xp: number
  current: Rank
  next: Rank | null
  xpIntoLevel: number
  xpForLevel: number // total XP span of this level (current → next)
  progressToNext: number // 0..1
}

export function getLevel(xp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(xp))
  let current = RANKS[0]!
  for (const r of RANKS) {
    if (safeXp >= r.threshold) current = r
    else break
  }
  const next = RANKS.find((r) => r.threshold > current.threshold) ?? null

  const xpIntoLevel = safeXp - current.threshold
  const xpForLevel = next ? next.threshold - current.threshold : 1
  const progressToNext = next ? Math.min(1, xpIntoLevel / xpForLevel) : 1

  return { xp: safeXp, current, next, xpIntoLevel, xpForLevel, progressToNext }
}

/** Streak milestone ladder — used for the dashboard ladder UI. */
export type StreakMilestone = {
  days: number
  labelEn: string
  labelAr: string
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, labelEn: 'Spark', labelAr: 'شرارة' },
  { days: 7, labelEn: 'Habit', labelAr: 'عادة' },
  { days: 14, labelEn: 'Roll', labelAr: 'انطلاق' },
  { days: 30, labelEn: 'Burn', labelAr: 'لهب' },
  { days: 60, labelEn: 'Forge', labelAr: 'صياغة' },
  { days: 100, labelEn: 'Legend', labelAr: 'أسطورة' },
]

export function getStreakMilestone(days: number): {
  reached: StreakMilestone | null
  next: StreakMilestone | null
} {
  const reached = [...STREAK_MILESTONES].reverse().find((m) => days >= m.days) ?? null
  const next = STREAK_MILESTONES.find((m) => days < m.days) ?? null
  return { reached, next }
}
