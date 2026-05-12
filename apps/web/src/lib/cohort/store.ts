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
