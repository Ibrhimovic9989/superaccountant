import { timingSafeEqual } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { onCohortCompleted, onGrandTestPassed } from '@/lib/community/auto-post-hooks'

/**
 * Internal endpoint apps/api calls right after grading a grand-test or
 * marking a cohort completed. Same shared-bearer pattern as
 * /api/internal/issue-cohort-credentials so a single INTERNAL_ISSUE_TOKEN
 * env var covers both wires.
 *
 * Both hooks are idempotent (partial-UNIQUE on CommunityPost catches
 * retries), so the caller can fire-and-await freely.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('grand-test-pass'), attemptId: z.string().min(1) }),
  z.object({ kind: z.literal('cohort-complete'), enrollmentId: z.string().min(1) }),
])

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
    if (parsed.kind === 'grand-test-pass') {
      await onGrandTestPassed(parsed.attemptId)
    } else {
      await onCohortCompleted(parsed.enrollmentId)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[internal/community-milestone-post] failed', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'internal error' },
      { status: 500 },
    )
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
