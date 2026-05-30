/**
 * Display-side catalog of SA Points milestones. Mirrors the canonical
 * registry in apps/api/src/contexts/loyalty/domain/milestones.ts —
 * keep both in lockstep. Points + reasons here are what students see
 * across /rewards, the wallet tile, and lesson hints.
 */

export type MilestoneInfo = {
  key: 'phase_complete' | 'grand_test_pass' | 'referral_conversion'
  points: number
  title: string
  description: string
  /** How many times a single user can earn this milestone (∞ = referrals). */
  maxAwards: number | 'unlimited'
  /** Lifetime cap for this milestone (display-only). */
  lifetimeCapPoints: number | 'unlimited'
}

export const MILESTONE_CATALOG: MilestoneInfo[] = [
  {
    key: 'phase_complete',
    points: 200,
    title: 'Complete a phase',
    description:
      'Finish every lesson in a curriculum phase (Foundation, Core, Specialization, or Capstone) and 200 SA points land in your wallet automatically.',
    maxAwards: 4,
    lifetimeCapPoints: 800,
  },
  {
    key: 'grand_test_pass',
    points: 1000,
    title: 'Pass the grand test',
    description:
      'Score 70%+ on the proctored final exam. One-shot reward — biggest single credit on the platform.',
    maxAwards: 1,
    lifetimeCapPoints: 1000,
  },
  {
    key: 'referral_conversion',
    points: 1000,
    title: 'Refer a friend who enrols',
    description:
      'Invite someone who pays for any cohort and 1,000 SA lands in your wallet — every conversion counts.',
    maxAwards: 'unlimited',
    lifetimeCapPoints: 'unlimited',
  },
]

/** Locked policy — kept here so a single source drives the UI copy. */
export const SA_POINTS_POLICY = {
  inrPerPoint: 1, // 1 SA = ₹1
  sarPerPoint: 1 / 22, // 22 SA = ﷼1
  expiryMonths: 12,
  maxRedemptionPercent: 100,
}
