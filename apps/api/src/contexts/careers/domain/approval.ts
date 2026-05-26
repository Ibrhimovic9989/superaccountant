/**
 * Company approval state machine. Pure domain logic — no I/O. The
 * `transition` function is the single source of truth; the service
 * layer calls it before persisting any status change so we can't ship
 * an illegal transition (e.g. suspended → pending_approval).
 *
 * State diagram:
 *
 *   pending_approval ─approve→ approved ─suspend→ suspended
 *                  ↑                              │
 *                  └── (no path back, admin only) │
 *                                                 │
 *                              approved ←reinstate┘
 *
 * Permission gates derived from status:
 *   canPostJobs(status)    → only when 'approved'
 *   canManageJobs(status)  → only when 'approved' (suspended cannot
 *                           edit/close their own jobs; admin must)
 */

export type CompanyStatus = 'pending_approval' | 'approved' | 'suspended'

export type ApprovalEvent =
  | { type: 'approve'; adminUserId: string }
  | { type: 'suspend'; adminUserId: string; reason?: string }
  | { type: 'reinstate'; adminUserId: string }

export type TransitionOk = {
  ok: true
  next: CompanyStatus
  /** Side-effect fields the service should persist alongside `status`. */
  patch: {
    approvedAt?: Date | null
    approvedByUserId?: string | null
    suspendedAt?: Date | null
    suspendReason?: string | null
  }
}

export type TransitionDenied = {
  ok: false
  reason: 'illegal_transition'
  from: CompanyStatus
  event: ApprovalEvent['type']
}

export type TransitionResult = TransitionOk | TransitionDenied

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
          // Clear any prior suspension residue from earlier states.
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
        patch: {
          suspendedAt: now,
          suspendReason: event.reason ?? null,
        },
      }

    case 'reinstate':
      if (current !== 'suspended') {
        return { ok: false, reason: 'illegal_transition', from: current, event: 'reinstate' }
      }
      return {
        ok: true,
        next: 'approved',
        patch: {
          suspendedAt: null,
          suspendReason: null,
        },
      }
  }
}

export function canPostJobs(status: CompanyStatus): boolean {
  return status === 'approved'
}

export function canManageJobs(status: CompanyStatus): boolean {
  return status === 'approved'
}
