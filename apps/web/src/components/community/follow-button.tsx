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
        className="rounded-full border-2 border-ink bg-brand px-5 py-2 text-sm font-bold text-white shadow-pop-sm transition-all hover:-translate-y-0.5 hover:shadow-pop-md active:translate-y-[2px] active:shadow-pop-xs"
      >
        Follow
      </a>
    )
  }

  const label = following ? (hover ? 'Unfollow' : 'Following ✓') : 'Follow'

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
        'rounded-full border-2 border-ink px-5 py-2 text-sm font-bold transition-all active:translate-y-[2px]',
        following
          ? hover
            ? 'bg-coral text-white shadow-pop-xs'
            : 'bg-white text-ink shadow-pop-xs hover:-translate-y-0.5'
          : 'bg-brand text-white shadow-pop-sm hover:-translate-y-0.5 hover:shadow-pop-md active:shadow-pop-xs',
      )}
    >
      {label}
    </button>
  )
}
