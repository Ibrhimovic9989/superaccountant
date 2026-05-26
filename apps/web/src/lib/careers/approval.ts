/**
 * Web-side mirror of apps/api/src/contexts/careers/domain/approval.ts.
 * If you change the state machine, change BOTH files. Tests for the
 * machine live in apps/api/src/contexts/careers/domain/approval.test.ts.
 */

export type CompanyStatus = 'pending_approval' | 'approved' | 'suspended'

export type ApprovalEvent =
  | { type: 'approve'; adminUserId: string }
  | { type: 'suspend'; adminUserId: string; reason?: string }
  | { type: 'reinstate'; adminUserId: string }

export type TransitionResult =
  | {
      ok: true
      next: CompanyStatus
      patch: {
        approvedAt?: Date | null
        approvedByUserId?: string | null
        suspendedAt?: Date | null
        suspendReason?: string | null
      }
    }
  | { ok: false; reason: 'illegal_transition'; from: CompanyStatus; event: ApprovalEvent['type'] }

export function transition(
  current: CompanyStatus,
  event: ApprovalEvent,
  now: Date = new Date(),
): TransitionResult {
  switch (event.type) {
    case 'approve':
      if (current !== 'pending_approval') {
        return { ok: false, reason: 'illegal_transition', from: current, event: 'approve' }
      }
      return {
        ok: true,
        next: 'approved',
        patch: {
          approvedAt: now,
          approvedByUserId: event.adminUserId,
          suspendedAt: null,
          suspendReason: null,
        },
      }
    case 'suspend':
      if (current !== 'approved') {
        return { ok: false, reason: 'illegal_transition', from: current, event: 'suspend' }
      }
      return {
        ok: true,
        next: 'suspended',
        patch: { suspendedAt: now, suspendReason: event.reason ?? null },
      }
    case 'reinstate':
      if (current !== 'suspended') {
        return { ok: false, reason: 'illegal_transition', from: current, event: 'reinstate' }
      }
      return {
        ok: true,
        next: 'approved',
        patch: { suspendedAt: null, suspendReason: null },
      }
  }
}

export function canPostJobs(status: CompanyStatus): boolean {
  return status === 'approved'
}
