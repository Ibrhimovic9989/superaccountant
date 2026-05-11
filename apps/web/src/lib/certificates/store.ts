import { createHmac, randomUUID } from 'node:crypto'
import { prisma } from '@sa/db'

/**
 * Persistence + Supabase Storage upload helpers for the bulk e-certificate
 * generator. Backed by raw SQL since the new tables aren't yet in the
 * generated Prisma client.
 */

const SUPA_URL = process.env.SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const HMAC_SECRET = process.env.NEXTAUTH_SECRET ?? 'dev-only-cert-secret'
const BUCKET = 'certificates'

export type BatchTemplateConfig = {
  title: string
  bodyTemplate: string
  issuerName: string
  issuerRole?: string | null
  issueDate: string
  accentColor?: string | null
  logoUrl?: string | null
}

export type Recipient = {
  name: string
  email?: string | null
}

export async function ensureCertificateBucket(): Promise<void> {
  if (!SUPA_URL || !SUPA_KEY) throw new Error('SUPABASE_URL or SERVICE_ROLE_KEY missing')
  const res = await fetch(`${SUPA_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (!text.includes('already exists') && !text.includes('Duplicate')) {
      console.warn(`! bucket create returned ${res.status}: ${text}`)
    }
  }
}

export async function uploadCertificatePdf(
  batchId: string,
  recordId: string,
  pdf: Buffer,
): Promise<string> {
  if (!SUPA_URL || !SUPA_KEY) throw new Error('SUPABASE_URL or SERVICE_ROLE_KEY missing')
  const path = `${batchId}/${recordId}.pdf`
  // Copy the Buffer into a fresh ArrayBuffer so the type is concretely
  // `ArrayBuffer` (not `ArrayBufferLike`) — Next's strict TS won't accept
  // the union with SharedArrayBuffer. Tiny extra alloc; fine for PDFs.
  const ab = new ArrayBuffer(pdf.byteLength)
  new Uint8Array(ab).set(pdf)
  const body = new Blob([ab], { type: 'application/pdf' })
  const res = await fetch(`${SUPA_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPA_KEY}`,
      'x-upsert': 'true',
    },
    body,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Storage upload ${res.status}: ${body}`)
  }
  return `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`
}

/** Stable verification hash so the certificate can be re-checked publicly. */
export function verifyHashFor(batchId: string, recordId: string, recipientName: string): string {
  return createHmac('sha256', HMAC_SECRET)
    .update(`${batchId}:${recordId}:${recipientName}`)
    .digest('hex')
    .slice(0, 16)
}

export async function createBatch(
  ownerUserId: string,
  cfg: BatchTemplateConfig,
  recipientCount: number,
): Promise<string> {
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO "CertificateBatch" (
      "id", "ownerUserId", "title", "bodyTemplate", "issuerName", "issuerRole",
      "issueDate", "accentColor", "logoUrl", "recipientCount"
    ) VALUES (
      ${id},
      ${ownerUserId},
      ${cfg.title},
      ${cfg.bodyTemplate},
      ${cfg.issuerName},
      ${cfg.issuerRole ?? null},
      ${cfg.issueDate}::date,
      ${cfg.accentColor ?? null},
      ${cfg.logoUrl ?? null},
      ${recipientCount}
    )
  `
  return id
}

export async function createRecord(args: {
  batchId: string
  recipientName: string
  recipientEmail: string | null
  pdfUrl: string
  verifyHash: string
}): Promise<string> {
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO "CertificateRecord" (
      "id", "batchId", "recipientName", "recipientEmail", "pdfUrl", "verifyHash"
    ) VALUES (
      ${id},
      ${args.batchId},
      ${args.recipientName},
      ${args.recipientEmail},
      ${args.pdfUrl},
      ${args.verifyHash}
    )
  `
  return id
}

export type IssuedCertificate = {
  id: string
  recipientName: string
  recipientEmail: string | null
  pdfUrl: string
  verifyHash: string
}

export async function listBatchRecords(batchId: string): Promise<IssuedCertificate[]> {
  return await prisma.$queryRaw`
    SELECT "id", "recipientName", "recipientEmail", "pdfUrl", "verifyHash"
    FROM "CertificateRecord"
    WHERE "batchId" = ${batchId}
    ORDER BY "issuedAt" ASC
  `
}
