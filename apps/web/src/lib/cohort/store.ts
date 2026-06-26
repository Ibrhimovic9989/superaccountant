import { randomUUID } from 'node:crypto'
import { prisma } from '@sa/db'
import { unstable_cache } from 'next/cache'
import { reviveDates } from '@/lib/cache-revive'

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

export type PaymentPlan = 'full' | 'installment-2'

export type CohortApplication = {
  id: string
  cohortId: string
  name: string
  email: string
  phone: string
  jobGoal: string | null
  status: CohortApplicationStatus
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
  /** First-installment / current-charge amount in minor units. */
  amountMinor: number
  currency: string
  paymentPlan: PaymentPlan
  /** Full cohort fee — equals amountMinor when paymentPlan='full'. */
  totalAmountMinor: number
  /** Running total of captured payments — bumped on each success. */
  paidAmountMinor: number
  /** When the next installment is due (NULL for fully paid / 'full' plan). */
  nextInstallmentDueAt: Date | null
  paidAt: Date | null
  createdAt: Date
}

/**
 * Indian-cohort installment schedule:
 *   - Installment 1: ₹10,000 today
 *   - Installment 2: ₹14,999 in 30 days
 *
 * Keep these here (not in the DB) since they're product-policy, not
 * per-cohort. When KSA gets its own plan, add a Saudi variant.
 */
export const INSTALLMENT_PLAN_INR = {
  firstAmountMinor: 1_000_000, // ₹10,000
  secondAmountMinor: 1_499_900, // ₹14,999
  /** Days after first payment that the second installment is due. */
  secondDueAfterDays: 30,
} as const

/**
 * Returns the first-installment amount for a given plan + cohort price.
 * For 'full', it's the full price. For 'installment-2', it's the
 * canonical first instalment from INSTALLMENT_PLAN_INR.
 *
 * Note: discounts ARE NOT compatible with installments today — if a
 * code is applied we charge it in full. The caller enforces that.
 */
export function firstInstallmentAmount(args: {
  plan: PaymentPlan
  fullAmountMinor: number
  currency: 'INR' | 'SAR'
}): number {
  if (args.plan === 'full') return args.fullAmountMinor
  if (args.currency === 'INR') return INSTALLMENT_PLAN_INR.firstAmountMinor
  // KSA doesn't offer installments yet — fall back to full.
  return args.fullAmountMinor
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

/** Seats claimed per cohort id — used for the live "X seats left" UI. */
export async function getPaidSeatCounts(): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ cohortId: string; n: number }[]>`
    SELECT "cohortId", COUNT(*)::int AS n
    FROM "CohortApplication"
    WHERE "status" = 'paid'
    GROUP BY "cohortId"
  `
  const map = new Map<string, number>()
  for (const r of rows) map.set(r.cohortId, r.n)
  return map
}

export async function getActiveCohorts(): Promise<Cohort[]> {
  return prisma.$queryRaw<Cohort[]>`
    SELECT "id", "slug", "track", "name", "city",
           "startDate", "durationDays",
           "currency", "originalPriceMinor", "discountedPriceMinor",
           "seatsTotal", "status"
    FROM "Cohort"
    WHERE "status" = 'open'
    ORDER BY "track" ASC, "startDate" ASC
  `
}

export async function getCohortById(id: string): Promise<Cohort | null> {
  const rows = await prisma.$queryRaw<Cohort[]>`
    SELECT "id", "slug", "track", "name", "city",
           "startDate", "durationDays",
           "currency", "originalPriceMinor", "discountedPriceMinor",
           "seatsTotal", "status"
    FROM "Cohort" WHERE "id" = ${id} LIMIT 1
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
  /** Discount code applied (lowercased). null = no discount. */
  discountCode?: string | null
  /** Display percentage off — kept for reporting. */
  discountPercent?: number
  /** Original (pre-discount) price for the audit trail. */
  originalAmountMinor?: number | null
  /** Payment plan — 'full' or 'installment-2'. Defaults to 'full'. */
  paymentPlan?: PaymentPlan
  /** Full cohort fee (used as totalAmountMinor on the application row). */
  totalAmountMinor?: number
  /** SA Points the user chose to spend. Debited on payment.captured. */
  saPointsRequested?: number
  /** Discount in minor units those SA Points produced. For receipts. */
  saPointsDiscountMinor?: number
}): Promise<string> {
  const id = randomUUID()
  const discountCode = input.discountCode?.toLowerCase() ?? null
  const discountPercent = input.discountPercent ?? 0
  const originalAmountMinor = input.originalAmountMinor ?? null
  const paymentPlan: PaymentPlan = input.paymentPlan ?? 'full'
  const totalAmountMinor = input.totalAmountMinor ?? input.amountMinor
  const saPointsRequested = input.saPointsRequested ?? 0
  const saPointsDiscountMinor = input.saPointsDiscountMinor ?? 0
  await prisma.$executeRaw`
    INSERT INTO "CohortApplication" (
      "id", "cohortId", "name", "email", "phone", "jobGoal",
      "status", "razorpayOrderId", "amountMinor", "currency",
      "discountCode", "discountPercent", "originalAmountMinor",
      "paymentPlan", "totalAmountMinor", "paidAmountMinor",
      "saPointsRequested", "saPointsDiscountMinor"
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
      ${input.currency},
      ${discountCode},
      ${discountPercent},
      ${originalAmountMinor},
      ${paymentPlan},
      ${totalAmountMinor},
      ${0},
      ${saPointsRequested},
      ${saPointsDiscountMinor}
    )
    ON CONFLICT ("cohortId", "email") DO UPDATE SET
      "name" = EXCLUDED."name",
      "phone" = EXCLUDED."phone",
      "jobGoal" = EXCLUDED."jobGoal",
      "razorpayOrderId" = EXCLUDED."razorpayOrderId",
      "amountMinor" = EXCLUDED."amountMinor",
      "currency" = EXCLUDED."currency",
      "discountCode" = EXCLUDED."discountCode",
      "discountPercent" = EXCLUDED."discountPercent",
      "originalAmountMinor" = EXCLUDED."originalAmountMinor",
      "paymentPlan" = EXCLUDED."paymentPlan",
      "totalAmountMinor" = EXCLUDED."totalAmountMinor",
      "saPointsRequested" = EXCLUDED."saPointsRequested",
      "saPointsDiscountMinor" = EXCLUDED."saPointsDiscountMinor",
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

/**
 * Mark an application paid for a captured Razorpay order. Handles both
 * full payment and installment payments:
 *
 *   - Adds `amountMinor` (the charged amount on this order) to
 *     `paidAmountMinor`.
 *   - Sets `status = 'paid'` (grants access). The 'partial' nuance is
 *     surfaced in the UI by comparing paidAmountMinor vs totalAmountMinor,
 *     not by a separate status — keeps the access tier check trivial.
 *   - Computes nextInstallmentDueAt: NULL once paidAmountMinor reaches
 *     totalAmountMinor, otherwise +30 days from first payment.
 */
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
        "paidAt" = COALESCE("paidAt", NOW()),
        "paidAmountMinor" = "paidAmountMinor" + "amountMinor",
        "nextInstallmentDueAt" = CASE
          WHEN ("paidAmountMinor" + "amountMinor") >= "totalAmountMinor"
            THEN NULL
          WHEN "paymentPlan" = 'installment-2' AND "nextInstallmentDueAt" IS NULL
            THEN NOW() + INTERVAL '30 days'
          ELSE "nextInstallmentDueAt"
        END,
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
  // Webhook can fire after the inline verify already credited the
  // payment — guard the bump so the same razorpayPaymentId can't be
  // counted twice.
  await prisma.$executeRaw`
    UPDATE "CohortApplication"
    SET "status" = 'paid',
        "paidAt" = COALESCE("paidAt", NOW()),
        "paidAmountMinor" = "paidAmountMinor" + "amountMinor",
        "nextInstallmentDueAt" = CASE
          WHEN ("paidAmountMinor" + "amountMinor") >= "totalAmountMinor"
            THEN NULL
          WHEN "paymentPlan" = 'installment-2' AND "nextInstallmentDueAt" IS NULL
            THEN NOW() + INTERVAL '30 days'
          ELSE "nextInstallmentDueAt"
        END,
        "razorpayPaymentId" = ${args.razorpayPaymentId},
        "updatedAt" = NOW()
    WHERE "razorpayOrderId" = ${args.razorpayOrderId}
      AND "razorpayPaymentId" IS DISTINCT FROM ${args.razorpayPaymentId}
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

/**
 * Get the most recent paid-but-not-fully-paid application for a user,
 * joined to the cohort. Used by /pay-balance to surface what's owed.
 */
/**
 * Read-only lookup for the dashboard balance banner — cached for 60s.
 * The mutation side (markApplicationPaid*, setBalanceOrderId) doesn't
 * call this, so a stale read here can't double-spend. Worst case is
 * 60s of "₹X due" lingering after the user pays the balance.
 */
export async function getApplicationWithBalance(email: string): Promise<
  | (CohortApplication & {
      cohortName: string
      cohortSlug: string
    })
  | null
> {
  const cached = await unstable_cache(
    () => loadApplicationWithBalance(email),
    ['app-with-balance', email.toLowerCase()],
    { revalidate: 60, tags: [`app-balance:${email.toLowerCase()}`] },
  )()
  return cached ? reviveDates(cached) : null
}

async function loadApplicationWithBalance(email: string): Promise<
  | (CohortApplication & {
      cohortName: string
      cohortSlug: string
    })
  | null
> {
  const rows = await prisma.$queryRaw<
    (CohortApplication & { cohortName: string; cohortSlug: string })[]
  >`
    SELECT a."id", a."cohortId", a."name", a."email", a."phone", a."jobGoal",
           a."status", a."razorpayOrderId", a."razorpayPaymentId",
           a."amountMinor", a."currency", a."paymentPlan",
           a."totalAmountMinor", a."paidAmountMinor",
           a."nextInstallmentDueAt", a."paidAt", a."createdAt",
           c."name" AS "cohortName", c."slug" AS "cohortSlug"
    FROM "CohortApplication" a
    JOIN "Cohort" c ON c."id" = a."cohortId"
    WHERE a."email" = ${email.toLowerCase()}
      AND a."status" = 'paid'
      AND a."paidAmountMinor" < a."totalAmountMinor"
    ORDER BY a."paidAt" DESC NULLS LAST, a."createdAt" DESC
    LIMIT 1
  `
  return rows[0] ?? null
}

/**
 * Record a follow-up Razorpay order for the balance. Just stamps the
 * new order id on the application — markApplicationPaid bumps
 * paidAmountMinor when the order completes.
 */
export async function setBalanceOrderId(args: {
  applicationId: string
  razorpayOrderId: string
  amountMinor: number
}): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "CohortApplication"
    SET "razorpayOrderId" = ${args.razorpayOrderId},
        "amountMinor" = ${args.amountMinor},
        "updatedAt" = NOW()
    WHERE "id" = ${args.applicationId}
  `
}

export async function getApplicationByOrderId(orderId: string): Promise<CohortApplication | null> {
  const rows = await prisma.$queryRaw<CohortApplication[]>`
    SELECT "id", "cohortId", "name", "email", "phone", "jobGoal",
           "status", "razorpayOrderId", "razorpayPaymentId",
           "amountMinor", "currency",
           "paymentPlan", "totalAmountMinor", "paidAmountMinor",
           "nextInstallmentDueAt",
           "paidAt", "createdAt"
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
  /**
   * When set, this is the FINAL price (in the cohort's minor units),
   * overriding any percent calculation. Used for "pay ₹1" style codes
   * that don't map cleanly to a percentage.
   */
  finalAmountMinor: number | null
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
    SELECT "id", "code", "discountPercent", "finalAmountMinor",
           "maxUses", "usedCount",
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

  // Two pricing modes:
  //   - finalAmountMinor set: hard override (e.g. "pay ₹1").
  //   - else: percent off the base price (e.g. 100% off = free).
  const discountedAmountMinor =
    c.finalAmountMinor !== null
      ? Math.max(0, Math.min(input.baseAmountMinor, c.finalAmountMinor))
      : Math.max(0, Math.round(input.baseAmountMinor * (1 - c.discountPercent / 100)))
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
      "paymentPlan", "totalAmountMinor", "paidAmountMinor",
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
      ${'full'},
      ${0},
      ${0},
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
      "paymentPlan" = 'full',
      "totalAmountMinor" = 0,
      "paidAmountMinor" = 0,
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
