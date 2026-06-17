import { issueCohortCredentials } from '@/lib/credentials/issue-cohort'
import { timingSafeEqual } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Internal endpoint the API (NestJS, on Vercel) calls after a student
 * passes the grand test. Issues the certificate + learning curve report
 * + sends a single combined email.
 *
 * Auth: shared bearer token. Reads INTERNAL_ISSUE_TOKEN; falls back to
 * NEXTAUTH_SECRET in local dev so the wire-up Just Works without an
 * extra env var to remember. Both sides MUST use the same secret in
 * prod — set INTERNAL_ISSUE_TOKEN on Vercel for both apps/web and
 * apps/api.
 *
 * Idempotent end-to-end: the underlying use-case re-uses existing rows
 * and skips email on subsequent calls. So the API can retry freely.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  userId: z.string().min(1),
  attemptId: z.string().min(1),
  market: z.enum(['india', 'ksa']),
  score: z.number().min(0).max(1),
})

export async function POST(request: NextRequest) {
  if (!verifyBearer(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  let parsed: z.infer<typeof Body>
  try {
    const json = await request.json()
    parsed = Body.parse(json)
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'invalid body' },
      { status: 400 },
    )
  }

  try {
    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXTAUTH_URL ??
      'https://app.superaccountant.in'

    const result = await issueCohortCredentials({
      userId: parsed.userId,
      attemptId: parsed.attemptId,
      market: parsed.market,
      score: parsed.score,
      appBaseUrl,
    })

    return NextResponse.json({
      ok: true,
      certificateVerifyUrl: result.certificate.verifyUrl,
      learningCurveVerifyUrl: result.learningCurve.verifyUrl,
      emailSent: result.email.sent,
      emailSkippedReason: result.email.skippedReason ?? null,
      reused: result.reused,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    console.error('[internal/issue-cohort-credentials] failed', err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

function verifyBearer(request: NextRequest): boolean {
  const header = request.headers.get('authorization') ?? ''
  const m = /^Bearer\s+(.+)$/i.exec(header.trim())
  if (!m?.[1]) return false
  const provided = m[1].trim()
  const expected = process.env.INTERNAL_ISSUE_TOKEN ?? process.env.NEXTAUTH_SECRET
  if (!expected) return false
  const a = Buffer.from(provided, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
