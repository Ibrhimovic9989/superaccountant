import { Bell } from 'lucide-react'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { countUnread } from '@/lib/community/notification-store'

/**
 * Notification bell for AppNav. Server component — the unread count
 * is resolved on the same request that renders the nav, so it's
 * always in sync with the actual state (no polling, no client
 * fetches, no drift).
 *
 * Renders nothing for signed-out viewers. Renders a small dot when
 * there's at least one unread. Renders "9+" style capped copy when
 * count > 9 so a burst of activity doesn't blow the layout.
 */

export async function NotificationBell({ locale }: { locale: 'en' | 'ar' }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null

  let unread = 0
  try {
    unread = await countUnread(userId)
  } catch {
    // Non-fatal — a broken bell shouldn't take down the nav.
    unread = 0
  }

  return (
    <Link
      href={`/${locale}/notifications`}
      aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-bg-elev text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg"
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 font-mono text-[9px] font-semibold text-accent-fg">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
