import 'server-only'
import { prisma } from '@sa/db'
import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { reviveDates } from '@/lib/cache-revive'

export type DayStatus = 'done' | 'partial' | 'missed' | 'pending' | 'upcoming'

export type StudyDay = {
  isoDate: string // yyyy-mm-dd in the server's local zone
  dayOfMonth: number
  weekdayShortEn: string
  weekdayShortAr: string
  isPast: boolean
  isToday: boolean
  isFuture: boolean
  status: DayStatus
  itemCount: number
}

export type StudyPlanSnapshot = {
  examDate: Date | null
  daysToExam: number | null
  hoursPerWeek: number | null
  pace: 'ahead' | 'on-track' | 'behind' | 'unknown'
  days: StudyDay[] // 14 days: past 7 + today + next 6
  missedDaysLast7: number
  todayItemCount: number
  todayDone: boolean
}

type DayBucket = {
  hasSubmitted: boolean
  hasInProgress: boolean
  itemCount: number
}

type AttemptRow = {
  startedAt: Date
  status: 'in_progress' | 'submitted' | 'graded' | 'abandoned'
  payload: unknown
}

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_AR = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function bucketAttempts(attempts: AttemptRow[]): Map<string, DayBucket> {
  const byDay = new Map<string, DayBucket>()
  for (const a of attempts) {
    const key = isoDate(a.startedAt)
    const bucket = byDay.get(key) ?? { hasSubmitted: false, hasInProgress: false, itemCount: 0 }
    if (a.status === 'submitted' || a.status === 'graded') bucket.hasSubmitted = true
    if (a.status === 'in_progress') bucket.hasInProgress = true
    const items = (a.payload as { items?: unknown[] } | null)?.items
    if (Array.isArray(items)) bucket.itemCount = Math.max(bucket.itemCount, items.length)
    byDay.set(key, bucket)
  }
  return byDay
}

function pastDayStatus(bucket: DayBucket | undefined): { status: DayStatus; missed: boolean } {
  if (bucket?.hasSubmitted) return { status: 'done', missed: false }
  if (bucket?.hasInProgress) return { status: 'partial', missed: false }
  return { status: 'missed', missed: true }
}

function todayStatus(bucket: DayBucket | undefined): DayStatus {
  if (bucket?.hasSubmitted) return 'done'
  if (bucket?.hasInProgress) return 'partial'
  return 'pending'
}

function buildDay(offsetDays: number, today: Date, byDay: Map<string, DayBucket>): StudyDay {
  const d = new Date(today.getTime() + offsetDays * DAY_MS)
  d.setHours(0, 0, 0, 0)
  const key = isoDate(d)
  const bucket = byDay.get(key)
  const isToday = offsetDays === 0
  const isPast = offsetDays < 0
  const isFuture = offsetDays > 0

  let status: DayStatus
  if (isToday) status = todayStatus(bucket)
  else if (isPast) status = pastDayStatus(bucket).status
  else status = 'upcoming'

  // Future days have no real plan yet — fall back to a typical assignment size.
  const itemCount = isFuture ? (bucket?.itemCount ?? 3) : (bucket?.itemCount ?? 0)

  return {
    isoDate: key,
    dayOfMonth: d.getDate(),
    weekdayShortEn: WEEKDAYS_EN[d.getDay()] ?? '',
    weekdayShortAr: WEEKDAYS_AR[d.getDay()] ?? '',
    isPast,
    isToday,
    isFuture,
    status,
    itemCount,
  }
}

function classifyPace(attemptCount: number, missedDaysLast7: number): StudyPlanSnapshot['pace'] {
  if (attemptCount === 0) return 'unknown'
  if (missedDaysLast7 === 0) return 'ahead'
  if (missedDaysLast7 <= 2) return 'on-track'
  return 'behind'
}

async function buildStudyPlan(userId: string): Promise<StudyPlanSnapshot> {
  const user = await prisma.identityUser.findUnique({
    where: { id: userId },
    select: { targetExamDate: true, studyHoursPerWeek: true },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const windowStart = new Date(today.getTime() - 7 * DAY_MS)
  const windowEnd = new Date(today.getTime() + 7 * DAY_MS)

  const attempts = await prisma.assessmentAttempt.findMany({
    where: {
      userId,
      kind: 'daily',
      startedAt: { gte: windowStart, lt: windowEnd },
    },
    select: { startedAt: true, status: true, payload: true },
    orderBy: { startedAt: 'asc' },
  })

  const byDay = bucketAttempts(attempts as AttemptRow[])

  // Build 14-day window: 7 past + today + 6 future.
  const days: StudyDay[] = []
  let missedDaysLast7 = 0
  for (let i = -7; i <= 6; i++) {
    const day = buildDay(i, today, byDay)
    if (day.isPast && day.status === 'missed') missedDaysLast7++
    days.push(day)
  }

  const pace = classifyPace(attempts.length, missedDaysLast7)

  const examDate = user?.targetExamDate ?? null
  const daysToExam = examDate
    ? Math.max(0, Math.ceil((examDate.getTime() - today.getTime()) / DAY_MS))
    : null

  const todayDay = days[7] // today is index 7 in the 14-day window
  return {
    examDate,
    daysToExam,
    hoursPerWeek: user?.studyHoursPerWeek ?? null,
    pace,
    days,
    missedDaysLast7,
    todayItemCount: todayDay?.itemCount ?? 0,
    todayDone: todayDay?.status === 'done',
  }
}

/**
 * 60s unstable_cache + React per-request dedup. The 14-day window's
 * bounds only shift at midnight, so a minute of staleness on attempt
 * counts is invisible to the user. Mutation hook: SubmitAnswerTool can
 * `revalidateTag('plan:${userId}')` so the pace badge ticks immediately.
 */
export const getStudyPlan = cache(async (userId: string) => {
  const cached = await unstable_cache(() => buildStudyPlan(userId), ['study-plan', userId], {
    revalidate: 60,
    tags: [`plan:${userId}`],
  })()
  return reviveDates(cached)
})
