import { describe, expect, it } from 'vitest'
import { discountMinorToPoints, planRedemption, pointsToDiscountMinor } from './conversion'

/**
 * Conversion is the part of the loyalty system most likely to drift
 * silently into rounding bugs that under- or over-discount real money.
 * Lock down the contract.
 */

describe('pointsToDiscountMinor', () => {
  it('1 SA = ₹1 → 100 paise', () => {
    expect(pointsToDiscountMinor(1, 'INR')).toBe(100)
    expect(pointsToDiscountMinor(500, 'INR')).toBe(50_000)
  })

  it('22 SA = ﷼1 → 100 halalas; partial rounds DOWN', () => {
    expect(pointsToDiscountMinor(22, 'SAR')).toBe(100)
    expect(pointsToDiscountMinor(44, 'SAR')).toBe(200)
    // 21 SA isn't enough for a whole SAR — must round down to 0.
    expect(pointsToDiscountMinor(21, 'SAR')).toBe(0)
    // 23 SA covers exactly 1 SAR, the extra 1 SA wasted.
    expect(pointsToDiscountMinor(23, 'SAR')).toBe(100)
  })

  it('zero or negative points → 0 minor', () => {
    expect(pointsToDiscountMinor(0, 'INR')).toBe(0)
    expect(pointsToDiscountMinor(-5, 'INR')).toBe(0)
    expect(pointsToDiscountMinor(0, 'SAR')).toBe(0)
  })
})

describe('discountMinorToPoints', () => {
  it('round-trips through INR', () => {
    expect(discountMinorToPoints(100, 'INR')).toBe(1)
    expect(discountMinorToPoints(50_000, 'INR')).toBe(500)
  })

  it('SAR requires 22 SA per riyal', () => {
    expect(discountMinorToPoints(100, 'SAR')).toBe(22)
    expect(discountMinorToPoints(500, 'SAR')).toBe(110)
  })
})

describe('planRedemption', () => {
  it('caps at wallet balance', () => {
    const r = planRedemption({
      requestedPoints: 1000,
      walletBalance: 300,
      orderTotalMinor: 100_000, // ₹1000
      currency: 'INR',
    })
    expect(r.pointsToDebit).toBe(300)
    expect(r.discountMinor).toBe(30_000) // ₹300
  })

  it('caps at order total — never refunds change as points', () => {
    const r = planRedemption({
      requestedPoints: 5000,
      walletBalance: 5000,
      orderTotalMinor: 100_000, // ₹1000 cart, wallet has ₹5000
      currency: 'INR',
    })
    expect(r.pointsToDebit).toBe(1000) // only ₹1000 worth used
    expect(r.discountMinor).toBe(100_000)
  })

  it('SAR redemption rounds down to whole riyals', () => {
    // Order is ﷼50 (5000 halalas), wallet has 200 SA points (=﷼9.09…
    // → rounded down to ﷼9 = 198 SA debited, 2 left in wallet).
    const r = planRedemption({
      requestedPoints: 200,
      walletBalance: 200,
      orderTotalMinor: 5000,
      currency: 'SAR',
    })
    expect(r.pointsToDebit).toBe(198) // 9 × 22
    expect(r.discountMinor).toBe(900) // 9 × 100 halalas
  })

  it('100% redemption is allowed', () => {
    const r = planRedemption({
      requestedPoints: 1000,
      walletBalance: 1000,
      orderTotalMinor: 100_000,
      currency: 'INR',
    })
    expect(r.pointsToDebit).toBe(1000)
    expect(r.discountMinor).toBe(100_000) // entire ₹1000 covered
  })

  it('empty wallet → no redemption', () => {
    const r = planRedemption({
      requestedPoints: 500,
      walletBalance: 0,
      orderTotalMinor: 100_000,
      currency: 'INR',
    })
    expect(r.pointsToDebit).toBe(0)
    expect(r.discountMinor).toBe(0)
  })
})
