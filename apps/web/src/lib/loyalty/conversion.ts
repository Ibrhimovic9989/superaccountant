/**
 * Web-side mirror of apps/api/src/contexts/loyalty/domain/conversion.ts.
 *
 * Kept as a copy (not a workspace import) because the web app and the
 * NestJS API don't share TS code — they share data via HTTP/DB. The
 * math is small and locked. If you change the rate, change BOTH files.
 *
 *   1 SA = ₹1 INR = 100 paise
 *   22 SA = ﷼1 SAR = 100 halalas (fixed rate, no FX feed)
 */

export type SupportedCurrency = 'INR' | 'SAR'

const POINTS_PER_UNIT: Record<SupportedCurrency, number> = { INR: 1, SAR: 22 }
const MINOR_PER_UNIT = 100

export function pointsToDiscountMinor(points: number, currency: SupportedCurrency): number {
  if (points <= 0) return 0
  const ratio = POINTS_PER_UNIT[currency]
  return Math.floor(points / ratio) * MINOR_PER_UNIT
}

export function planRedemption(args: {
  requestedPoints: number
  walletBalance: number
  orderTotalMinor: number
  currency: SupportedCurrency
}): { pointsToDebit: number; discountMinor: number } {
  const requested = Math.max(0, Math.floor(args.requestedPoints))
  const capped = Math.min(requested, args.walletBalance)
  const ratio = POINTS_PER_UNIT[args.currency]
  const usableWholeUnits = Math.min(
    Math.floor(capped / ratio),
    Math.floor(args.orderTotalMinor / MINOR_PER_UNIT),
  )
  return {
    pointsToDebit: usableWholeUnits * ratio,
    discountMinor: usableWholeUnits * MINOR_PER_UNIT,
  }
}
