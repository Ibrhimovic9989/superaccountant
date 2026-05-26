import { describe, expect, it } from 'vitest'
import { canManageJobs, canPostJobs, transition } from './approval'

/**
 * The approval state machine is the only thing standing between an
 * unverified employer and them posting jobs to our cohort grads. Lock
 * down every transition + every gate.
 */

describe('transition', () => {
  it('pending_approval → approved on approve', () => {
    const r = transition('pending_approval', { type: 'approve', adminUserId: 'admin1' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.next).toBe('approved')
    expect(r.patch.approvedByUserId).toBe('admin1')
    expect(r.patch.approvedAt).toBeInstanceOf(Date)
    expect(r.patch.suspendedAt).toBeNull()
    expect(r.patch.suspendReason).toBeNull()
  })

  it('approved → suspended on suspend with reason', () => {
    const r = transition('approved', {
      type: 'suspend',
      adminUserId: 'admin1',
      reason: 'fake postings',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.next).toBe('suspended')
    expect(r.patch.suspendReason).toBe('fake postings')
    expect(r.patch.suspendedAt).toBeInstanceOf(Date)
  })

  it('suspended → approved on reinstate (clears suspension fields)', () => {
    const r = transition('suspended', { type: 'reinstate', adminUserId: 'admin1' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.next).toBe('approved')
    expect(r.patch.suspendedAt).toBeNull()
    expect(r.patch.suspendReason).toBeNull()
  })

  it('rejects illegal transitions', () => {
    // pending → suspend (must approve first)
    expect(
      transition('pending_approval', { type: 'suspend', adminUserId: 'a' }).ok,
    ).toBe(false)
    // approved → reinstate (already approved)
    expect(
      transition('approved', { type: 'reinstate', adminUserId: 'a' }).ok,
    ).toBe(false)
    // suspended → approve (must reinstate, not re-approve)
    expect(
      transition('suspended', { type: 'approve', adminUserId: 'a' }).ok,
    ).toBe(false)
    // approve already-approved (idempotency NOT inferred — admin must
    // explicitly know they're re-approving via a different code path)
    expect(
      transition('approved', { type: 'approve', adminUserId: 'a' }).ok,
    ).toBe(false)
  })

  it('uses the provided clock for timestamps', () => {
    const fixed = new Date('2026-06-15T10:00:00Z')
    const r = transition('pending_approval', { type: 'approve', adminUserId: 'a' }, fixed)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.patch.approvedAt).toEqual(fixed)
  })
})

describe('permission gates', () => {
  it('only approved companies can post / manage jobs', () => {
    expect(canPostJobs('approved')).toBe(true)
    expect(canManageJobs('approved')).toBe(true)
    expect(canPostJobs('pending_approval')).toBe(false)
    expect(canPostJobs('suspended')).toBe(false)
    expect(canManageJobs('suspended')).toBe(false)
  })
})
