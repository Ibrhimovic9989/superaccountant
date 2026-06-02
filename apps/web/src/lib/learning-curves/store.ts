import 'server-only'
import { createHmac, randomUUID } from 'node:crypto'
import { prisma } from '@sa/db'

/**
 * Persistence + Supabase Storage helpers for the admin "learning curve"
 * PDF report. Mirrors the certificates/store.ts pattern (raw SQL, public
 * bucket, HMAC-signed verify hash) — but the row tracks WHICH admin
 * generated the report so we can audit who handed what to a recruiter.
 */

const SUPA_URL = process.env.SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const HMAC_SECRET = process.env.NEXTAUTH_SECRET ?? 'dev-only-curve-secret'
export const LEARNING_CURVE_BUCKET = 'learning-curves'

export type LearningCurveReport = {
  id: string
  userId: string
  pdfUrl: string
  verifyHash: string
  generatedByUserId: string
  createdAt: Date
}

export async function ensureLearningCurveBucket(): Promise<void> {
  if (!SUPA_URL || !SUPA_KEY) throw new Error('SUPABASE_URL or SERVICE_ROLE_KEY missing')
  const res = await fetch(`${SUPA_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: LEARNING_CURVE_BUCKET, name: LEARNING_CURVE_BUCKET, public: true }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (!text.includes('already exists') && !text.includes('Duplicate')) {
      console.warn(`! learning-curves bucket create returned ${res.status}: ${text}`)
    }
  }
}

export async function uploadLearningCurvePdf(
  userId: string,
  reportId: string,
  pdf: Buffer,
): Promise<string> {
  if (!SUPA_URL || !SUPA_KEY) throw new Error('SUPABASE_URL or SERVICE_ROLE_KEY missing')
  const path = `${userId}/${reportId}.pdf`
  // Same alloc-copy dance as certificates: keep the Blob source typed as
  // ArrayBuffer (not SharedArrayBuffer) so Next's strict TS is happy.
  const ab = new ArrayBuffer(pdf.byteLength)
  new Uint8Array(ab).set(pdf)
  const body = new Blob([ab], { type: 'application/pdf' })
  const res = await fetch(`${SUPA_URL}/storage/v1/object/${LEARNING_CURVE_BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPA_KEY}`,
      'x-upsert': 'true',
    },
    body,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Storage upload ${res.status}: ${text}`)
  }
  return `${SUPA_URL}/storage/v1/object/public/${LEARNING_CURVE_BUCKET}/${path}`
}

export function curveVerifyHash(userId: string, generatedAt: Date): string {
  return createHmac('sha256', HMAC_SECRET)
    .update(`${userId}:${generatedAt.toISOString()}`)
    .digest('hex')
    .slice(0, 16)
}

export async function createLearningCurveReport(args: {
  userId: string
  pdfUrl: string
  verifyHash: string
  generatedByUserId: string
}): Promise<LearningCurveReport> {
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO "LearningCurveReport" (
      "id", "userId", "pdfUrl", "verifyHash", "generatedByUserId"
    ) VALUES (
      ${id},
      ${args.userId},
      ${args.pdfUrl},
      ${args.verifyHash},
      ${args.generatedByUserId}
    )
  `
  const rows = await prisma.$queryRaw<LearningCurveReport[]>`
    SELECT "id", "userId", "pdfUrl", "verifyHash", "generatedByUserId", "createdAt"
    FROM "LearningCurveReport" WHERE "id" = ${id} LIMIT 1
  `
  if (!rows[0]) throw new Error('LearningCurveReport row vanished after insert')
  return rows[0]
}

/**
 * Idempotency helper: return the most recent report for this user that's
 * less than `maxAgeMs` old, or null if none. The admin "Generate PDF"
 * button uses this to avoid re-generating a fresh report every click.
 */
export async function findRecentReportForUser(
  userId: string,
  maxAgeMs: number,
): Promise<LearningCurveReport | null> {
  const cutoff = new Date(Date.now() - maxAgeMs)
  const rows = await prisma.$queryRaw<LearningCurveReport[]>`
    SELECT "id", "userId", "pdfUrl", "verifyHash", "generatedByUserId", "createdAt"
    FROM "LearningCurveReport"
    WHERE "userId" = ${userId} AND "createdAt" >= ${cutoff}
    ORDER BY "createdAt" DESC
    LIMIT 1
  `
  return rows[0] ?? null
}

export async function findReportByHash(hash: string): Promise<
  | (LearningCurveReport & {
      studentName: string | null
      studentEmail: string
    })
  | null
> {
  const rows = await prisma.$queryRaw<
    Array<LearningCurveReport & { studentName: string | null; studentEmail: string }>
  >`
    SELECT
      r."id", r."userId", r."pdfUrl", r."verifyHash",
      r."generatedByUserId", r."createdAt",
      u."name" AS "studentName", u."email" AS "studentEmail"
    FROM "LearningCurveReport" r
    JOIN "IdentityUser" u ON u."id" = r."userId"
    WHERE r."verifyHash" = ${hash}
    LIMIT 1
  `
  return rows[0] ?? null
}
