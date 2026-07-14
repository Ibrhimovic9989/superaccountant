'use client'

import { Bell } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { UserMenu } from '../user-menu'

/**
 * Client-side user chrome for the community nav.
 *
 * Replaces the server-side <NotificationBell/> + <UserMenu/> pair
 * that used to live in CommunityNav. Those two components called
 * `auth()` server-side, which forced every community route into
 * fully-dynamic mode → `Cache-Control: no-store` on the response →
 * Googlebot refuses to index. See /api/me for the full background.
 *
 * Now: pages render as anonymous SSG. This component fetches
 * `/api/me` after mount, then renders either the signed-in chrome
 * (notification bell + user menu) or the "Sign in" affordance.
 *
 * Initial render is the "signed-out" state, so signed-in users see
 * a brief flash of "Sign in" for ~200ms until hydration completes.
 * Accepted tradeoff — the SEO win (billions of tag/profile/post
 * pages become indexable) beats the one-frame visual glitch.
 */

type Me =
  | { signedIn: false }
  | { signedIn: true; name: string | null; email: string; unread: number }

export function UserChrome({ locale }: { locale: 'en' | 'ar' }) {
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/api/me', { cache: 'no-store', signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { signedIn: false }))
      .then((data: Me) => setMe(data))
      .catch(() => setMe({ signedIn: false }))
    return () => ctrl.abort()
  }, [])

  // Pre-hydration: show a compact skeleton so the layout doesn't
  // jump when the real chrome lands. The dashed border reads as
  // intentional and doesn't look like a broken button.
  if (me === null) {
    return (
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-8 w-8 rounded-full border-2 border-dashed border-ink/20 bg-white/40"
        />
      </div>
    )
  }

  if (!me.signedIn) {
    return (
      <Link
        href={`/${locale}/sign-in`}
        className="rounded-full border-2 border-ink bg-white px-4 py-1.5 text-sm font-bold text-ink shadow-pop-xs transition-all hover:-translate-y-0.5 hover:shadow-pop-sm active:translate-y-[2px]"
      >
        Sign in
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <Link
        href={`/${locale}/notifications`}
        aria-label={me.unread > 0 ? `${me.unread} unread notifications` : 'Notifications'}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-white text-ink transition-all hover:-translate-y-0.5 hover:shadow-pop-xs"
      >
        <Bell className="h-4 w-4" />
        {me.unread > 0 && (
          <span className="absolute -end-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full border-2 border-ink bg-coral px-1 font-mono text-[9px] font-black text-white">
            {me.unread > 9 ? '9+' : me.unread}
          </span>
        )}
      </Link>
      <UserMenu locale={locale} userName={me.name} userEmail={me.email} />
    </div>
  )
}
