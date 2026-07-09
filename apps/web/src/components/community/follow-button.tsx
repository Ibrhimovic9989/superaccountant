'use client'

import { useState, useTransition } from 'react'
import { toggleFollowAction } from '@/lib/community/actions'
import { cn } from '@/lib/utils'

/**
 * Toggle-follow button used on the ProfileHeader.
 *
 * Two visual states so a user can tell they've already followed at a
 * glance: solid accent = "Follow", outlined = "Following" with a
 * "Unfollow" hover hint. Optimistic — the count on the profile updates
 * on the client immediately; a background revalidate replaces both
 * with the server-of-truth values on the next navigation.
 */

export function FollowButton({
  followedId,
  initialFollowing,
  signedIn,
  locale,
}: {
  followedId: string
  initialFollowing: boolean
  signedIn: boolean
  locale: 'en' | 'ar'
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [hover, setHover] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!signedIn) {
    return (
      <a
        href={`/${locale}/sign-in`}
        className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-fg hover:opacity-90"
      >
        Follow
      </a>
    )
  }

  const label = following ? (hover ? 'Unfollow' : 'Following') : 'Follow'

  const onClick = () => {
    const next = !following
    setFollowing(next)
    startTransition(async () => {
      try {
        const result = await toggleFollowAction({ followedId })
        setFollowing(result.following)
      } catch {
        setFollowing(!next)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={pending}
      className={cn(
        'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
        following
          ? 'border border-border bg-bg text-fg-muted hover:border-danger/50 hover:text-danger'
          : 'bg-accent text-accent-fg hover:opacity-90',
      )}
    >
      {label}
    </button>
  )
}
