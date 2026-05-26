/**
 * SA Point ↔ currency conversion.
 *
 *   1 SA point = ₹1 INR = 100 paise
 *   22 SA points = ﷼1 SAR = 100 halalas (fixed rate, no FX feed)
 *
 * Money everywhere in the codebase is in smallest-currency units
 * (integer paise / halalas), per CLAUDE.md §8.
 */

export type SupportedCurrency = 'INR' | 'SAR'

/** SA points per 1 unit of currency. Used for redemption arithmetic. */
const POINTS_PER_UNIT: Record<SupportedCurrency, number> = {
  INR: 1, //   1 SA = 1 INR
  SAR: 22, // 22 SA = 1 SAR
}

/** Minor units (paise / halalas) per 1 major unit. Both 100 for INR & SAR. */
const MINOR_PER_UNIT = 100

/**
 * How much can `points` discount off an order in `currency`, in minor units?
 * Rounds DOWN to a whole currency unit — you can't spend 21 SA on a SAR
 * order and get 0.95 SAR off; you spend 22 SA and get 1 SAR off.
 */
export function pointsToDiscountMinor(points: number, currency: SupportedCurrency): number {
  if (points <= 0) return 0
  const ratio = POINTS_PER_UNIT[currency]
  const wholeUnits = Math.floor(points / ratio)
  return wholeUnits * MINOR_PER_UNIT
}

/**
 * Inverse: how many SA points are needed to cover a minor-unit amount?
 * Rounds UP — covering ₹0.50 still requires a full 1-point round-up
 * conceptually, but since INR/SAR pricing snaps to whole units, this
 * is effectively just the major-unit count × the ratio.
 */
export function discountMinorToPoints(amountMinor: number, currency: SupportedCurrency): number {
  if (amountMinor <= 0) return 0
  const ratio = POINTS_PER_UNIT[currency]
  const majorUnits = Math.ceil(amountMinor / MINOR_PER_UNIT)
  return majorUnits * ratio
}

/**
 * Cap a requested redemption against (a) the wallet balance and
 * (b) the order total. Returns the actual points to debit and the
 * resulting discount in minor units. Used at checkout to enforce the
 * "up to 100% of cart" rule without overspending the wallet.
 */
export function planRedemption(args: {
  requestedPoints: number
  walletBalance: number
  orderTotalMinor: number
  currency: SupportedCurrency
}): { pointsToDebit: number; discountMinor: number } {
  const requested = Math.max(0, Math.floor(args.requestedPoints))
  const capped = Math.min(requested, args.walletBalance)
  const ratio = POINTS_PER_UNIT[args.currency]

  // Don't credit fractional currency. Round capped points DOWN to a
  // whole-currency multiple so the discount lands on a clean amount.
  const usableWholeUnits = Math.min(
    Math.floor(capped / ratio),
    Math.floor(args.orderTotalMinor / MINOR_PER_UNIT),
  )
  return {
    pointsToDebit: usableWholeUnits * ratio,
    discountMinor: usableWholeUnits * MINOR_PER_UNIT,
  }
}
