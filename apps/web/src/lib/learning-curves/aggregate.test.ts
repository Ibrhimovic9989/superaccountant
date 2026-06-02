import { describe, expect, it, vi } from 'vitest'

/**
 * Aggregation tests. The aggregator hits Prisma directly so we mock
 * @sa/db's `prisma` and feed canned rows for each $queryRaw call.
 *
 * The contract we care about:
 *   1. Phase rollup: masteryAvg = SUM(mastery)/COUNT(progress rows)
 *   2. Phase completedAt only set when completed === total
 *   3. clamp01 keeps mastery in [0,1]
 *   4. Grand test pass threshold = 0.6
 *   5. listEnrolledStudents collapses duplicate paid apps per user
 */

const queryRaw = vi.fn()
vi.mock('@sa/db', () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
  },
}))

import { getLearningCurve, listEnrolledStudents } from './aggregate'

function queue(...batches: unknown[][]) {
  queryRaw.mockReset()
  for (const b of batches) queryRaw.mockResolvedValueOnce(b)
}

describe('getLearningCurve', () => {
  it('returns null when user does not exist', async () => {
    queue([])
    const r = await getLearningCurve('nope')
    expect(r).toBeNull()
  })

  it('rolls up phase mastery and marks completedAt only when fully done', async () => {
    queue(
      // user
      [{ id: 'u1', name: 'Asha', email: 'asha@example.com', preferredTrack: 'india' }],
      // enrollment
      [{ id: 'e1', enrolledAt: new Date('2026-01-01') }],
      // entry assessment
      [{ score: 0.42, gradedAt: new Date('2026-01-02'), payload: { placedPhase: 2 } }],
      // phase rollup
      [
        {
          phaseId: 'p1',
          order: 1,
          titleEn: 'Foundation',
          titleAr: 'Foundation AR',
          totalLessons: 4,
          completedLessons: 4,
          masterySum: 3.6,
          masteryCount: 4,
          lastReviewedAt: new Date('2026-03-10'),
        },
        {
          phaseId: 'p2',
          order: 2,
          titleEn: 'Core',
          titleAr: 'Core AR',
          totalLessons: 5,
          completedLessons: 2,
          masterySum: 2.0,
          masteryCount: 4,
          lastReviewedAt: new Date('2026-04-01'),
        },
      ],
      // grand test
      [{ score: 0.81, gradedAt: new Date('2026-05-20') }],
      // overall summary
      [{ overallMastery: 0.7, totalDaysActive: 42 }],
    )
    const r = await getLearningCurve('u1')
    expect(r).not.toBeNull()
    if (!r) return
    expect(r.user.market).toBe('india')
    expect(r.entryTest?.score).toBeCloseTo(0.42)
    expect(r.entryTest?.placedPhase).toBe(2)

    expect(r.phases).toHaveLength(2)
    // Foundation: 3.6/4 = 0.9 mastery, fully done → completedAt set.
    expect(r.phases[0]?.masteryAvg).toBeCloseTo(0.9)
    expect(r.phases[0]?.completedAt).toEqual(new Date('2026-03-10'))
    // Core: 2.0/4 = 0.5 mastery, only 2/5 done → completedAt null.
    expect(r.phases[1]?.masteryAvg).toBeCloseTo(0.5)
    expect(r.phases[1]?.completedAt).toBeNull()

    expect(r.grandTest?.passed).toBe(true)
    expect(r.overallMastery).toBeCloseTo(0.7)
    expect(r.totalDaysActive).toBe(42)
  })

  it('marks grand test failed below 60% threshold', async () => {
    queue(
      [{ id: 'u2', name: 'Yusuf', email: 'y@example.com', preferredTrack: 'ksa' }],
      [{ id: 'e2', enrolledAt: new Date('2026-02-01') }],
      [], // no entry attempt
      [], // no entry session
      [], // empty phases
      [{ score: 0.55, gradedAt: new Date('2026-05-01') }],
      [{ overallMastery: 0.55, totalDaysActive: 10 }],
    )
    const r = await getLearningCurve('u2')
    expect(r?.grandTest?.passed).toBe(false)
    expect(r?.user.market).toBe('ksa')
  })

  it('clamps mastery to [0,1] when summary row is malformed', async () => {
    queue(
      [{ id: 'u3', name: 'X', email: 'x@x.com', preferredTrack: 'india' }],
      [],
      [],
      [],
      [],
      [],
      // Overflowing mastery (shouldn't happen but guard against)
      [{ overallMastery: 1.7, totalDaysActive: 5 }],
    )
    const r = await getLearningCurve('u3')
    expect(r?.overallMastery).toBe(1)
  })
})

describe('listEnrolledStudents', () => {
  it('collapses duplicate paid apps per user and sorts by enrolledAt desc', async () => {
    queue([
      {
        userId: 'a',
        name: 'A',
        email: 'a@a.com',
        preferredTrack: 'india',
        cohortTrack: 'india',
        paidAt: new Date('2026-04-01'),
        completedAt: null,
      },
      {
        userId: 'b',
        name: 'B',
        email: 'b@b.com',
        preferredTrack: null,
        cohortTrack: 'ksa',
        paidAt: new Date('2026-05-01'),
        completedAt: new Date('2026-05-30'),
      },
    ])
    const rows = await listEnrolledStudents()
    expect(rows.map((r) => r.userId)).toEqual(['b', 'a'])
    expect(rows[0]?.market).toBe('ksa')
    expect(rows[0]?.hasCompletedCohort).toBe(true)
    expect(rows[1]?.hasCompletedCohort).toBe(false)
  })

  it('filters by market', async () => {
    queue([
      {
        userId: 'a',
        name: 'A',
        email: 'a@a.com',
        preferredTrack: 'india',
        cohortTrack: 'india',
        paidAt: new Date('2026-04-01'),
        completedAt: null,
      },
      {
        userId: 'b',
        name: 'B',
        email: 'b@b.com',
        preferredTrack: 'ksa',
        cohortTrack: 'ksa',
        paidAt: new Date('2026-05-01'),
        completedAt: null,
      },
    ])
    const rows = await listEnrolledStudents({ market: 'ksa' })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.userId).toBe('b')
  })
})
