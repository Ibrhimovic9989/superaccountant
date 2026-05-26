/**
 * Milestone catalog — the canonical list of events that credit SA points
 * to a user's wallet. Each entry has:
 *
 *   - key      a deterministic milestoneKey written to LoyaltyLedgerEntry
 *              and LoyaltyMilestoneAchievement (uniqueness key).
 *   - points   amount credited.
 *   - reason   human-readable string shown in wallet history.
 *
 * Adding a new milestone: append here, write a caller in the relevant
 * bounded context, and call LoyaltyService.creditMilestone(). The
 * (userId, milestoneKey) UNIQUE index in LoyaltyMilestoneAchievement
 * makes double-credits impossible at the DB level.
 *
 * Per CLAUDE.md §3.4 (OCP): new milestones extend the registry without
 * touching dispatch code.
 */

export type MilestoneDescriptor = {
  /** Deterministic key. Either a literal string or a builder that takes
   *  per-instance state (phase id, referred user id, etc.) and returns
   *  the unique key. */
  buildKey: (ctx: Record<string, string>) => string
  /** Points credited when the milestone fires. Always positive. */
  points: number
  /** Human-readable reason shown in wallet history (EN). */
  reason: (ctx: Record<string, string>) => string
}

export const MILESTONES = {
  phase_complete: {
    buildKey: (ctx) => `phase_complete:${ctx.phaseId}`,
    points: 200,
    reason: (ctx) => `Phase completed: ${ctx.phaseName ?? ctx.phaseId}`,
  },
  grand_test_pass: {
    buildKey: () => 'grand_test_pass',
    points: 1000,
    reason: () => 'Grand test passed',
  },
  referral_conversion: {
    buildKey: (ctx) => `referral:${ctx.referredUserId}`,
    points: 1000,
    reason: (ctx) => `Referral converted — ${ctx.referredName ?? ctx.referredUserId} joined`,
  },
} as const satisfies Record<string, MilestoneDescriptor>

export type MilestoneType = keyof typeof MILESTONES
