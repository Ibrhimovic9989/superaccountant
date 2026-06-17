import 'server-only'
import { createHmac, randomUUID } from 'node:crypto'
import { prisma } from '@sa/db'
import { buildCohortGraduationEmail, sendEmail } from '@sa/email'
import { renderCertificateBuffer } from '@/lib/certificates/pdf-template'
import { generateLearningCurveReport } from '@/lib/learning-curves/generate'

/**
 * Cohort-graduation credential bundle.
 *
 * One use-case that wraps everything we hand the student the moment
 * they pass the grand test:
 *
 *   1. Render + upload the cohort certificate PDF
 *   2. Insert the CertificationCertificate row (HMAC-signed)
 *   3. Render + upload the learning-curve PDF (reuses the existing
 *      generateLearningCurveReport pipeline — same table, same bucket)
 *   4. Send ONE combined email with both verify URLs + both PDFs
 *      attached
 *
 * Idempotent: re-running for the same (userId, attemptId) returns the
 * existing certificate row without re-rendering or re-emailing. The
 * curve pipeline is independently idempotent on its own (24h window).
 *
 * Per CA Muneer's voice note (2026-06-17):
 *   "When the candidate walks out, the certificate goes with the
 *    learning curve so recruiters can size them up without re-assessing."
 *
 * This is THE single place that wiring lives. Both the API (after
 * grand-test pass) and the admin-triggered "issue now" button call into
 * this — never into the cert/curve halves directly.
 */

const SUPA_URL = process.env.SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const HMAC_SECRET = process.env.NEXTAUTH_SECRET ?? 'dev-only-cohort-cert-secret'
const COHORT_CERT_BUCKET = 'cohort-certificates'

export type IssueCohortCredentialsArgs = {
  userId: string
  attemptId: string
  market: 'india' | 'ksa'
  score: number
  /** Absolute origin used to compose verify URLs. */
  appBaseUrl: string
}

export type IssuedCohortCredentials = {
  certificate: {
    id: string
    hash: string
    pdfUrl: string
    verifyUrl: string
  }
  learningCurve: {
    reportId: string
    hash: string
    pdfUrl: string
    verifyUrl: string
  }
  email: {
    sent: boolean
    /** Reason we didn't send, if applicable. Lets ops know without scraping logs. */
    skippedReason?: string
  }
  reused: boolean
}

export async function issueCohortCredentials(
  args: IssueCohortCredentialsArgs,
): Promise<IssuedCohortCredentials> {
  const user = await prisma.identityUser.findUnique({
    where: { id: args.userId },
    select: { id: true, name: true, email: true, locale: true },
  })
  if (!user) throw new Error(`user ${args.userId} not found`)

  // ── 1. Cert: reuse if it already exists ──────────────────
  const existingCert = await prisma.certificationCertificate.findUnique({
    where: { attemptId: args.attemptId },
  })

  const cert = existingCert
    ? {
        id: existingCert.id,
        hash: existingCert.hash,
        pdfUrl: existingCert.pdfUrl,
        verifyUrl: composeVerifyUrl(args.appBaseUrl, 'verify', existingCert.hash, user.locale),
      }
    : await issueCertificate({
        userId: user.id,
        userName: user.name ?? user.email,
        attemptId: args.attemptId,
        market: args.market,
        score: args.score,
        locale: user.locale === 'ar' ? 'ar' : 'en',
        appBaseUrl: args.appBaseUrl,
      })

  // ── 2. Learning curve report (idempotent inside the generator) ──
  const { report, reused: curveReused } = await generateLearningCurveReport({
    userId: args.userId,
    generatedByUserId: args.userId, // self-service issuance
    appBaseUrl: args.appBaseUrl,
  })
  const curveVerifyUrl = composeVerifyUrl(
    args.appBaseUrl,
    'verify-curve',
    report.verifyHash,
    user.locale,
  )

  // ── 3. Combined email — skip if missing email or pre-existed ──
  // Sending policy: ship the email on first issuance only. Re-running
  // this use-case (e.g., admin force-refresh) won't spam the recipient.
  let emailResult: IssuedCohortCredentials['email'] = { sent: false }
  const isFirstIssuance = !existingCert && !curveReused
  if (!user.email) {
    emailResult = { sent: false, skippedReason: 'no recipient email on file' }
  } else if (!isFirstIssuance) {
    emailResult = { sent: false, skippedReason: 'already sent on a previous issuance' }
  } else {
    const localeForEmail = user.locale === 'ar' ? 'ar' : 'en'
    const { subject, html, text } = buildCohortGraduationEmail({
      recipientName: user.name ?? user.email,
      scorePct: args.score * 100,
      certVerifyUrl: cert.verifyUrl,
      curveVerifyUrl,
      locale: localeForEmail,
    })

    // Pull both PDFs so we can attach them. fetch() returns a stream
    // we can read into a Buffer for Resend's attachment shape.
    const [certPdf, curvePdf] = await Promise.allSettled([
      fetchAsBuffer(cert.pdfUrl, args.appBaseUrl),
      fetchAsBuffer(report.pdfUrl, args.appBaseUrl),
    ])

    const attachments: Array<{ filename: string; content: Buffer }> = []
    if (certPdf.status === 'fulfilled') {
      attachments.push({
        filename: `${safeFilename(user.name ?? user.email)}_certificate.pdf`,
        content: certPdf.value,
      })
    } else {
      console.error('[cohort-issue] cert PDF fetch failed for attachment', certPdf.reason)
    }
    if (curvePdf.status === 'fulfilled') {
      attachments.push({
        filename: `${safeFilename(user.name ?? user.email)}_learning_curve.pdf`,
        content: curvePdf.value,
      })
    } else {
      console.error('[cohort-issue] curve PDF fetch failed for attachment', curvePdf.reason)
    }

    try {
      await sendEmail({ to: user.email, subject, html, text, attachments })
      emailResult = { sent: true }
    } catch (err) {
      console.error('[cohort-issue] sendEmail failed', err)
      emailResult = {
        sent: false,
        skippedReason: err instanceof Error ? err.message : 'unknown send error',
      }
    }
  }

  return {
    certificate: cert,
    learningCurve: {
      reportId: report.id,
      hash: report.verifyHash,
      pdfUrl: report.pdfUrl,
      verifyUrl: curveVerifyUrl,
    },
    email: emailResult,
    reused: !!existingCert && curveReused,
  }
}

// ──────────────────────────────────────────────────────────────
// Cert rendering + upload — first-time only
// ──────────────────────────────────────────────────────────────

async function issueCertificate(args: {
  userId: string
  userName: string
  attemptId: string
  market: 'india' | 'ksa'
  score: number
  locale: 'en' | 'ar'
  appBaseUrl: string
}) {
  await ensureCohortCertBucket()

  const issuedAt = new Date()
  const hash = signCertHash({
    userId: args.userId,
    market: args.market,
    score: args.score,
    issuedAt,
  })
  const verifyUrl = composeVerifyUrl(args.appBaseUrl, 'verify', hash, args.locale)

  const buf = await renderCertificateBuffer(
    {
      templateId: 'ornate-cream',
      title:
        args.locale === 'ar'
          ? 'شهادة إتمام دورة سوبر أكاونتنت'
          : 'SuperAccountant Cohort Completion',
      bodyTemplate: buildCohortCertBodyTemplate(args.market, args.score, args.locale),
      issuerName: 'CA Muneer Ahmed',
      issuerRole: 'Founder, SuperAccountant',
      issueDate: issuedAt.toISOString().slice(0, 10),
      location: args.market === 'india' ? 'Hyderabad' : 'Riyadh',
    },
    { recipientName: args.userName, verifyUrl },
  )

  const pdfUrl = await uploadCertPdf(args.userId, hash, buf)

  const cert = await prisma.certificationCertificate.create({
    data: {
      userId: args.userId,
      trackId: args.market,
      attemptId: args.attemptId,
      score: args.score,
      issuedAt,
      hash,
      pdfUrl,
    },
  })

  return { id: cert.id, hash, pdfUrl, verifyUrl }
}

function buildCohortCertBodyTemplate(
  market: 'india' | 'ksa',
  score: number,
  locale: 'en' | 'ar',
): string {
  const pct = Math.round(score * 100)
  const trackTitle =
    market === 'india'
      ? locale === 'ar'
        ? 'مسار الهند المعتمد'
        : 'Chartered Path · India'
      : locale === 'ar'
        ? "مسار مُعتمَد · السعودية"
        : "Mu'tamad Path · KSA"
  if (locale === 'ar') {
    return [
      `هذه الشهادة تثبت أن {{name}} قد أتمّ بنجاح برنامج سوبر أكاونتنت — ${trackTitle}،`,
      `بدرجة ${pct}٪ في الاختبار النهائي الشامل.`,
      '',
      'تشمل البرامج التي أتقنها: المحاسبة، الإكسل، الضريبة على القيمة المضافة / السلع والخدمات،',
      'الاستقطاع الضريبي، التدقيق، تحضير الميزانية العمومية، ومعايير المحاسبة المعتمدة.',
    ].join('\n')
  }
  return [
    `This is to certify that {{name}} has successfully completed the SuperAccountant ${trackTitle} programme,`,
    `with a final grand-test score of ${pct}%.`,
    '',
    'Demonstrated competencies include Accounting, Excel, GST/VAT, TDS, Audit basics,',
    'Balance Sheet preparation, and the relevant statutory standards.',
  ].join('\n')
}

function signCertHash(args: {
  userId: string
  market: string
  score: number
  issuedAt: Date
}): string {
  return createHmac('sha256', HMAC_SECRET)
    .update(`${args.userId}|${args.market}|${args.score}|${args.issuedAt.toISOString()}`)
    .digest('hex')
    .slice(0, 32)
}

function composeVerifyUrl(
  appBaseUrl: string,
  path: 'verify' | 'verify-curve',
  hash: string,
  locale: string | null | undefined,
): string {
  const loc = locale === 'ar' ? 'ar' : 'en'
  return `${appBaseUrl.replace(/\/$/, '')}/${loc}/${path}/${hash}`
}

// ──────────────────────────────────────────────────────────────
// Supabase Storage helpers — kept local so the cohort cert can
// have its own bucket without touching the masterclass cert store.
// ──────────────────────────────────────────────────────────────

async function ensureCohortCertBucket(): Promise<void> {
  if (!SUPA_URL || !SUPA_KEY) throw new Error('SUPABASE_URL or SERVICE_ROLE_KEY missing')
  const res = await fetch(`${SUPA_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: COHORT_CERT_BUCKET,
      name: COHORT_CERT_BUCKET,
      public: true,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (!text.includes('already exists') && !text.includes('Duplicate')) {
      console.warn(`! cohort-certificates bucket create returned ${res.status}: ${text}`)
    }
  }
}

async function uploadCertPdf(userId: string, hash: string, buf: Buffer): Promise<string> {
  if (!SUPA_URL || !SUPA_KEY) throw new Error('SUPABASE_URL or SERVICE_ROLE_KEY missing')
  const path = `${userId}/${hash}.pdf`
  const res = await fetch(
    `${SUPA_URL}/storage/v1/object/${COHORT_CERT_BUCKET}/${path}?upsert=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/pdf',
        'x-upsert': 'true',
      },
      // fetch BodyInit type from @types/node lacks Buffer/Uint8Array
      // but undici accepts them fine at runtime — cast through unknown.
      body: buf as unknown as BodyInit,
    },
  )
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`cohort-cert upload failed ${res.status}: ${text.slice(0, 300)}`)
  }
  return `${SUPA_URL}/storage/v1/object/public/${COHORT_CERT_BUCKET}/${path}`
}

async function fetchAsBuffer(url: string, appBaseUrl: string): Promise<Buffer> {
  // pdfUrls may be relative (e.g. /__certificates/...) when running
  // local dev against the disk-backed cert pipeline. Resolve those
  // against appBaseUrl so the email send still works.
  const absolute = url.startsWith('http') ? url : new URL(url, appBaseUrl).toString()
  const res = await fetch(absolute)
  if (!res.ok) throw new Error(`fetch ${absolute} failed ${res.status}`)
  const ab = await res.arrayBuffer()
  return Buffer.from(ab)
}

function safeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_\- ]/g, '').trim()
  const safe = cleaned.length > 0 ? cleaned : 'student'
  return safe.replace(/\s+/g, '_')
}

void randomUUID
