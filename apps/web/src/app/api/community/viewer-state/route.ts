import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@sa/db'

/**
 * Batched viewer state for a set of community posts. Given a list of
 * post IDs, returns which of them the viewer has liked and saved.
 *
 * This is the second half of the "kill no-cache on public pages" fix
 * (see /api/me for the first). Public feed / profile / tag / reels
 * pages render as anonymous SSG with `viewerLiked=false` on every
 * card. On the client, ViewerStateProvider POSTs the visible post IDs
 * here in one call, then LikeButton/SaveButton read their true state
 * from that response.
 *
 * One round-trip per page-mount rather than N — the Reactions table
 * has a partial UNIQUE index on (userId, postId, kind) so this is a
 * single index-only scan.
 */
export const dynamic = 'force-dynamic'

const Body = z.object({
  postIds: z.array(z.string().min(1).max(64)).max(200),
})

export async function POST(req: Request) {
  let parsed
  try {
    parsed = Body.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'bad_body' }, { status: 400 })
  }
  const { postIds } = parsed

  const session = await auth()
  if (!session?.user?.id || postIds.length === 0) {
    return NextResponse.json(
      { liked: {}, saved: {} },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  const rows = await prisma.$queryRawUnsafe<
    Array<{ postId: string; kind: 'like' | 'save' }>
  >(
    `SELECT "postId", "kind" FROM "CommunityPostReaction"
     WHERE "userId" = $1 AND "postId" = ANY($2::text[])`,
    session.user.id,
    postIds,
  )

  const liked: Record<string, true> = {}
  const saved: Record<string, true> = {}
  for (const r of rows) {
    if (r.kind === 'like') liked[r.postId] = true
    else if (r.kind === 'save') saved[r.postId] = true
  }
  return NextResponse.json(
    { liked, saved },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
