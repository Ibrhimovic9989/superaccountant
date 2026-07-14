import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { countUnread } from '@/lib/community/notification-store'

/**
 * "Who is the current viewer?" endpoint. Used by community-side
 * client components (UserChrome, ViewerStateProvider) to hydrate
 * session data AFTER the page has been served as static HTML.
 *
 * Why this exists: every public community page used to `await auth()`
 * at the top of its render, which touches cookies and forces Next to
 * treat the whole route as fully-dynamic — `Cache-Control: no-store`
 * on every response. Googlebot won't index a page that explicitly
 * asks not to be cached, so as of 2026-07-14 GSC reported the app
 * subdomain had zero of its public URLs discovered.
 *
 * The fix is to move `auth()` off the render path and into this JSON
 * endpoint. Pages render as anonymous SSG (cacheable, indexable);
 * signed-in state hydrates on the client after mount.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { signedIn: false, name: null, email: null, unread: 0 },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
  const unread = await countUnread(session.user.id).catch(() => 0)
  return NextResponse.json(
    {
      signedIn: true,
      userId: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? '',
      unread,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
