import { randomUUID } from 'node:crypto'
import { prisma } from '@sa/db'

/**
 * Cohort + CohortApplication persistence. Backed by raw SQL because
 * these tables were added via add-cohort-tables.mjs and aren't yet in
 * the generated Prisma client.
 *
 * Money lives in *_PriceMinor / amountMinor columns as integer minor
 * units (paise, halalas) — never floats.
 */

export type Cohort = {
  id: string
  slug: string
  track: 'india' | 'ksa'
  name: string
  city: string | null
  startDate: Date
  durationDays: number
  currency: 'INR' | 'SAR'
  originalPriceMinor: number
  discountedPriceMinor: number
  seatsTotal: number
  status: 'open' | 'closed' | 'full'
}

export type CohortApplicationStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export type CohortApplication = {
  id: string
  cohortId: string
  name: string
  email: string
  phone: string
  jobGoal: string | null
  status: CohortApplicationStatus
  razorpayOrderId: string
  razorpayPaymentId: string | null
  amountMinor: number
  currency: string
  paidAt: Date | null
  createdAt: Date
}

/** Pick the currently-open cohort for a given track (lowest startDate). */
export async function getActiveCohortForTrack(track: 'india' | 'ksa'): Promise<Cohort | null> {
  const rows = await prisma.$queryRaw<Cohort[]>`
    SELECT "id", "slug", "track", "name", "city",
           "startDate", "durationDays",
           "currency", "originalPriceMinor", "discountedPriceMinor",
           "seatsTotal", "status"
    FROM "Cohort"
    WHERE "track" = ${track} AND "status" = 'open'
    ORDER BY "startDate" ASC
    LIMIT 1
  `
  return rows[0] ?? null
}

export async function getCohortBySlug(slug: string): Promise<Cohort | null> {
  const rows = await prisma.$queryRaw<Cohort[]>`
    SELECT "id", "slug", "track", "name", "city",
           "startDate", "durationDays",
           "currency", "originalPriceMinor", "discountedPriceMinor",
           "seatsTotal", "status"
    FROM "Cohort" WHERE "slug" = ${slug} LIMIT 1
  `
  return rows[0] ?? null
}

export async function countPaidSeats(cohortId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n
    FROM "CohortApplication"
    WHERE "cohortId" = ${cohortId} AND "status" = 'paid'
  `
  return rows[0]?.n ?? 0
}

/**
 * Insert a new application in 'pending' state (right after the
 * Razorpay order is created but before payment completes). If an
 * application with the same (cohort, email) already exists, we
 * UPDATE its razorpayOrderId so the user can retry checkout without
 * being blocked by the unique constraint.
 */
export async function upsertPendingApplication(input: {
  cohortId: string
  name: string
  email: string
  phone: string
  jobGoal: string | null
  razorpayOrderId: string
  amountMinor: number
  currency: string
}): Promise<string> {
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO "CohortApplication" (
      "id", "cohortId", "name", "email", "phone", "jobGoal",
      "status", "razorpayOrderId", "amountMinor", "currency"
    ) VALUES (
      ${id},
      ${input.cohortId},
      ${input.name},
      ${input.email.toLowerCase()},
      ${input.phone},
      ${input.jobGoal},
      'pending',
      ${input.razorpayOrderId},
      ${input.amountMinor},
      ${input.currency}
    )
    ON CONFLICT ("cohortId", "email") DO UPDATE SET
      "name" = EXCLUDED."name",
      "phone" = EXCLUDED."phone",
      "jobGoal" = EXCLUDED."jobGoal",
      "razorpayOrderId" = EXCLUDED."razorpayOrderId",
      "amountMinor" = EXCLUDED."amountMinor",
      "currency" = EXCLUDED."currency",
      -- Reset to pending only if not yet paid; preserve paid state.
      "status" = CASE WHEN "CohortApplication"."status" = 'paid'
                      THEN "CohortApplication"."status"
                      ELSE 'pending' END,
      "updatedAt" = NOW()
  `
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "CohortApplication"
    WHERE "cohortId" = ${input.cohortId} AND "email" = ${input.email.toLowerCase()}
    LIMIT 1
  `
  return rows[0]?.id ?? id
}

export async function markApplicationPaid(args: {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "CohortApplication"
    SET "status" = 'paid',
        "razorpayPaymentId" = ${args.razorpayPaymentId},
        "razorpaySignature" = ${args.razorpaySignature},
        "paidAt" = NOW(),
        "updatedAt" = NOW()
    WHERE "razorpayOrderId" = ${args.razorpayOrderId}
  `
}

/**
 * Webhook-driven paid transition. Razorpay webhooks don't carry the
 * Checkout-style signature (that one is only emitted client-side), so
 * we just record the payment id. Idempotent: a row already in 'paid'
 * stays in 'paid'.
 */
export async function markApplicationPaidByWebhook(args: {
  razorpayOrderId: string
  razorpayPaymentId: string
}): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "CohortApplication"
    SET "status" = 'paid',
        "razorpayPaymentId" = ${args.razorpayPaymentId},
        "paidAt" = COALESCE("paidAt", NOW()),
        "updatedAt" = NOW()
    WHERE "razorpayOrderId" = ${args.razorpayOrderId}
      AND "status" <> 'paid'
  `
}

export async function markApplicationFailed(orderId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "CohortApplication"
    SET "status" = 'failed',
        "updatedAt" = NOW()
    WHERE "razorpayOrderId" = ${orderId}
      AND "status" = 'pending'
  `
}

export async function markApplicationRefundedByPaymentId(paymentId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "CohortApplication"
    SET "status" = 'refunded',
        "updatedAt" = NOW()
    WHERE "razorpayPaymentId" = ${paymentId}
  `
}

export async function getApplicationByOrderId(orderId: string): Promise<CohortApplication | null> {
  const rows = await prisma.$queryRaw<CohortApplication[]>`
    SELECT "id", "cohortId", "name", "email", "phone", "jobGoal",
           "status", "razorpayOrderId", "razorpayPaymentId",
           "amountMinor", "currency", "paidAt", "createdAt"
    FROM "CohortApplication"
    WHERE "razorpayOrderId" = ${orderId} LIMIT 1
  `
  return rows[0] ?? null
}

// ── DiscountCode ──────────────────────────────────────────────────

export type DiscountCode = {
  id: string
  code: string
  discountPercent: number
  maxUses: number | null
  usedCount: number
  validFrom: Date | null
  validUntil: Date | null
  cohortId: string | null
  active: boolean
}

export type DiscountValidationError =
  | 'unknown'
  | 'inactive'
  | 'exhausted'
  | 'not_started'
  | 'expired'
  | 'wrong_cohort'

export type DiscountValidationResult =
  | { ok: true; code: DiscountCode; discountedAmountMinor: number }
  | { ok: false; reason: DiscountValidationError }

/**
 * Looks up a code (case-insensitive) and validates it for the given cohort
 * at the current moment. Returns the resulting amount in minor units so
 * callers don't recompute. Does NOT increment usage — that happens at
 * order-create / free-enroll time so we don't burn uses on validation alone.
 */
export async function validateDiscountCode(input: {
  code: string
  cohortId: string
  baseAmountMinor: number
}): Promise<DiscountValidationResult> {
  const normalized = input.code.trim().toLowerCase()
  if (!normalized) return { ok: false, reason: 'unknown' }

  const rows = await prisma.$queryRaw<DiscountCode[]>`
    SELECT "id", "code", "discountPercent", "maxUses", "usedCount",
           "validFrom", "validUntil", "cohortId", "active"
    FROM "DiscountCode"
    WHERE LOWER("code") = ${normalized}
    LIMIT 1
  `
  const c = rows[0]
  if (!c) return { ok: false, reason: 'unknown' }
  if (!c.active) return { ok: false, reason: 'inactive' }
  if (c.maxUses !== null && c.usedCount >= c.maxUses) {
    return { ok: false, reason: 'exhausted' }
  }
  const now = Date.now()
  if (c.validFrom && c.validFrom.getTime() > now) {
    return { ok: false, reason: 'not_started' }
  }
  if (c.validUntil && c.validUntil.getTime() < now) {
    return { ok: false, reason: 'expired' }
  }
  if (c.cohortId && c.cohortId !== input.cohortId) {
    return { ok: false, reason: 'wrong_cohort' }
  }

  const discountedAmountMinor = Math.max(
    0,
    Math.round(input.baseAmountMinor * (1 - c.discountPercent / 100)),
  )
  return { ok: true, code: c, discountedAmountMinor }
}

/**
 * Atomic increment + max-uses guard. Returns true if the bump succeeded
 * (i.e. the code was active and still had headroom). Use this just
 * before creating the order so we don't over-issue.
 */
export async function consumeDiscountCode(codeId: string): Promise<boolean> {
  const result = await prisma.$executeRaw`
    UPDATE "DiscountCode"
    SET "usedCount" = "usedCount" + 1,
        "updatedAt" = NOW()
    WHERE "id" = ${codeId}
      AND "active" = TRUE
      AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
  `
  return result > 0
}

/**
 * Free enrollment — 100% off, no Razorpay round-trip. Inserts (or updates
 * an existing pending row for the same cohort+email) directly into paid
 * state. Idempotent on the unique (cohortId, email) key.
 */
export async function createPaidApplicationFree(input: {
  cohortId: string
  name: string
  email: string
  phone: string
  jobGoal: string | null
  discountCode: string
  originalAmountMinor: number
  currency: string
}): Promise<string> {
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO "CohortApplication" (
      "id", "cohortId", "name", "email", "phone", "jobGoal",
      "status", "razorpayOrderId",
      "amountMinor", "currency",
      "discountCode", "discountPercent", "originalAmountMinor",
      "paidAt"
    ) VALUES (
      ${id},
      ${input.cohortId},
      ${input.name},
      ${input.email.toLowerCase()},
      ${input.phone},
      ${input.jobGoal},
      'paid',
      ${null},
      ${0},
      ${input.currency},
      ${input.discountCode.toLowerCase()},
      ${100},
      ${input.originalAmountMinor},
      NOW()
    )
    ON CONFLICT ("cohortId", "email") DO UPDATE SET
      "name" = EXCLUDED."name",
      "phone" = EXCLUDED."phone",
      "jobGoal" = EXCLUDED."jobGoal",
      "status" = 'paid',
      "amountMinor" = 0,
      "discountCode" = EXCLUDED."discountCode",
      "discountPercent" = 100,
      "originalAmountMinor" = EXCLUDED."originalAmountMinor",
      "paidAt" = COALESCE("CohortApplication"."paidAt", NOW()),
      "updatedAt" = NOW()
  `
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "CohortApplication"
    WHERE "cohortId" = ${input.cohortId} AND "email" = ${input.email.toLowerCase()}
    LIMIT 1
  `
  return rows[0]?.id ?? id
}

/** Format paise → '₹24,999' / halalas → 'SAR 1,099.50' etc. */
export function formatPrice(minor: number, currency: string): string {
  const major = minor / 100
  if (currency === 'INR') {
    return `₹${major.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  }
  if (currency === 'SAR') {
    return `SAR ${major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `${currency} ${major.toLocaleString()}`
}
