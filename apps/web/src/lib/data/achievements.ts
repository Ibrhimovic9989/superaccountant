import { prisma } from '@sa/db'

/**
 * Achievement badges — computed from existing DB state, no new tables needed.
 * Each badge has a check function that returns true/false + progress fraction.
 */

export type Badge = {
  id: string
  nameEn: string
  nameAr: string
  descEn: string
  descAr: string
  emoji: string
  earned: boolean
  progress: number // 0..1
  earnedAt: Date | null
}

type BadgeDef = {
  id: string
  nameEn: string
  nameAr: string
  descEn: string
  descAr: string
  emoji: string
  check: (ctx: BadgeContext) => { earned: boolean; progress: number; earnedAt: Date | null }
}

type BadgeContext = {
  completedLessons: number
  totalLessons: number
  streakDays: number
  perfectPracticeCount: number
  hasCertificate: boolean
  firstCompletedAt: Date | null
  certificateAt: Date | null
  tutorMessageCount: number
  averageMastery: number
}

const BADGES: BadgeDef[] = [
  {
    id: 'first-lesson',
    nameEn: 'First Step',
    nameAr: 'الخطوة الأولى',
    descEn: 'Complete your first lesson',
    descAr: 'أكمل درسك الأول',
    emoji: '🎯',
    check: (ctx) => ({
      earned: ctx.completedLessons >= 1,
      progress: Math.min(ctx.completedLessons / 1, 1),
      earnedAt: ctx.firstCompletedAt,
    }),
  },
  {
    id: 'five-lessons',
    nameEn: 'Getting Serious',
    nameAr: 'بداية جدية',
    descEn: 'Complete 5 lessons',
    descAr: 'أكمل ٥ دروس',
    emoji: '📚',
    check: (ctx) => ({
      earned: ctx.completedLessons >= 5,
      progress: Math.min(ctx.completedLessons / 5, 1),
      earnedAt: ctx.firstCompletedAt,
    }),
  },
  {
    id: 'ten-lessons',
    nameEn: 'Double Digits',
    nameAr: 'رقمان',
    descEn: 'Complete 10 lessons',
    descAr: 'أكمل ١٠ دروس',
    emoji: '🔟',
    check: (ctx) => ({
      earned: ctx.completedLessons >= 10,
      progress: Math.min(ctx.completedLessons / 10, 1),
      earnedAt: ctx.firstCompletedAt,
    }),
  },
  {
    id: 'streak-3',
    nameEn: 'On a Roll',
    nameAr: 'في سلسلة',
    descEn: 'Maintain a 3-day study streak',
    descAr: 'حافظ على سلسلة دراسة ٣ أيام',
    emoji: '🔥',
    check: (ctx) => ({
      earned: ctx.streakDays >= 3,
      progress: Math.min(ctx.streakDays / 3, 1),
      earnedAt: null,
    }),
  },
  {
    id: 'streak-7',
    nameEn: 'Week Warrior',
    nameAr: 'محارب الأسبوع',
    descEn: 'Maintain a 7-day study streak',
    descAr: 'حافظ على سلسلة دراسة ٧ أيام',
    emoji: '⚡',
    check: (ctx) => ({
      earned: ctx.streakDays >= 7,
      progress: Math.min(ctx.streakDays / 7, 1),
      earnedAt: null,
    }),
  },
  {
    id: 'streak-30',
    nameEn: 'Month of Mastery',
    nameAr: 'شهر الإتقان',
    descEn: 'Maintain a 30-day study streak',
    descAr: 'حافظ على سلسلة دراسة ٣٠ يومًا',
    emoji: '👑',
    check: (ctx) => ({
      earned: ctx.streakDays >= 30,
      progress: Math.min(ctx.streakDays / 30, 1),
      earnedAt: null,
    }),
  },
  {
    id: 'perfect-practice',
    nameEn: 'Perfect Score',
    nameAr: 'نتيجة مثالية',
    descEn: 'Get 100% on a practice set',
    descAr: 'احصل على ١٠٠٪ في مجموعة تمارين',
    emoji: '💯',
    check: (ctx) => ({
      earned: ctx.perfectPracticeCount >= 1,
      progress: Math.min(ctx.perfectPracticeCount / 1, 1),
      earnedAt: null,
    }),
  },
  {
    id: 'tutor-curious',
    nameEn: 'Curious Mind',
    nameAr: 'عقل فضولي',
    descEn: 'Ask the tutor 10 questions',
    descAr: 'اسأل المدرس ١٠ أسئلة',
    emoji: '🧠',
    check: (ctx) => ({
      earned: ctx.tutorMessageCount >= 10,
      progress: Math.min(ctx.tutorMessageCount / 10, 1),
      earnedAt: null,
    }),
  },
  {
    id: 'high-mastery',
    nameEn: 'Top of Class',
    nameAr: 'الأول على الصف',
    descEn: 'Reach 90% average mastery',
    descAr: 'حقق ٩٠٪ متوسط إتقان',
    emoji: '🏆',
    check: (ctx) => ({
      earned: ctx.averageMastery >= 0.9 && ctx.completedLessons >= 5,
      progress: Math.min(ctx.averageMastery / 0.9, 1),
      earnedAt: null,
    }),
  },
  {
    id: 'certified',
    nameEn: 'Certified',
    nameAr: 'معتمد',
    descEn: 'Earn your certificate',
    descAr: 'احصل على شهادتك',
    emoji: '🎓',
    check: (ctx) => ({
      earned: ctx.hasCertificate,
      progress: ctx.hasCertificate ? 1 : 0,
      earnedAt: ctx.certificateAt,
    }),
  },
  {
    id: 'half-curriculum',
    nameEn: 'Halfway There',
    nameAr: 'نصف الطريق',
    descEn: 'Complete 50% of the curriculum',
    descAr: 'أكمل ٥٠٪ من المنهج',
    emoji: '🏔️',
    check: (ctx) => ({
      earned: ctx.totalLessons > 0 && ctx.completedLessons >= ctx.totalLessons / 2,
      progress: ctx.totalLessons > 0 ? ctx.completedLessons / (ctx.totalLessons / 2) : 0,
      earnedAt: null,
    }),
  },
  {
    id: 'full-curriculum',
    nameEn: 'Curriculum Complete',
    nameAr: 'المنهج مكتمل',
    descEn: 'Complete every lesson in your track',
    descAr: 'أكمل كل درس في مسارك',
    emoji: '🌟',
    check: (ctx) => ({
      earned: ctx.totalLessons > 0 && ctx.completedLessons >= ctx.totalLessons,
      progress: ctx.totalLessons > 0 ? ctx.completedLessons / ctx.totalLessons : 0,
      earnedAt: null,
    }),
  },
]

export async function getAchievements(
  userId: string,
  market: 'india' | 'ksa',
): Promise<Badge[]> {
  // Gather all context in parallel.
  const [progressRows, certRow, tutorCount, lessonCount] = await Promise.all([
    prisma.$queryRaw<
      { mastery: number; lastReviewedAt: Date | null }[]
    >`
      SELECT lp.mastery, lp."lastReviewedAt"
      FROM "LearningProgress" lp
      JOIN "LearningEnrollment" le ON lp."enrollmentId" = le.id
      WHERE le."userId" = ${userId}
    `,
    prisma.certificationCertificate.findFirst({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
      select: { issuedAt: true },
    }),
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count
      FROM "TutoringSessionMemory" m
      JOIN "TutoringSession" s ON m."sessionId" = s.id
      WHERE s."userId" = ${userId} AND m.kind = 'scratch'
    `.catch(() => [{ count: 0 }]),
    prisma.$queryRaw<{ total: number }[]>`
      SELECT COUNT(*)::int as total
      FROM "CurriculumLesson" l
      JOIN "CurriculumModule" m ON l."moduleId" = m.id
      JOIN "CurriculumPhase" p ON m."phaseId" = p.id
      JOIN "CurriculumTrack" t ON p."trackId" = t.id
      WHERE t.market::text = ${market}
    `,
  ])

  const completedLessons = progressRows.filter((p) => Number(p.mastery) >= 0.7).length
  const perfectPracticeCount = progressRows.filter((p) => Number(p.mastery) >= 1).length
  const averageMastery =
    progressRows.length > 0
      ? progressRows.reduce((a, p) => a + Number(p.mastery), 0) / progressRows.length
      : 0
  const streakDays = computeStreak(progressRows.map((p) => p.lastReviewedAt))
  const dates = progressRows
    .map((p) => p.lastReviewedAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())

  const ctx: BadgeContext = {
    completedLessons,
    totalLessons: lessonCount[0]?.total ?? 0,
    streakDays,
    perfectPracticeCount,
    hasCertificate: !!certRow,
    firstCompletedAt: dates[0] ?? null,
    certificateAt: certRow?.issuedAt ?? null,
    tutorMessageCount: tutorCount[0]?.count ?? 0,
    averageMastery,
  }

  return BADGES.map((def) => {
    const result = def.check(ctx)
    return {
      id: def.id,
      nameEn: def.nameEn,
      nameAr: def.nameAr,
      descEn: def.descEn,
      descAr: def.descAr,
      emoji: def.emoji,
      earned: result.earned,
      progress: Math.min(result.progress, 1),
      earnedAt: result.earnedAt,
    }
  })
}

function computeStreak(dates: Array<Date | null>): number {
  const days = new Set<string>()
  for (const d of dates) {
    if (!d) continue
    days.add(d.toISOString().slice(0, 10))
  }
  let streak = 0
  const cur = new Date()
  cur.setHours(0, 0, 0, 0)
  for (let i = 0; i < 90; i++) {
    const key = cur.toISOString().slice(0, 10)
    if (days.has(key)) {
      streak++
      cur.setDate(cur.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}
