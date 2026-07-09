'use client'

import { Heart } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toggleLikeAction } from '@/lib/community/actions'
import { cn } from '@/lib/utils'

/**
 * Optimistic like button. Fires the server action, rolls back on
 * error, always shows a stable count. Signed-out viewers get a link
 * to /sign-in when they tap.
 *
 * Deliberately simple — no toasts, no confetti. Instagram's own like
 * button is a heart that fills. That's the ceiling.
 */

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
  signedIn,
  locale,
  size = 'md',
}: {
  postId: string
  initialLiked: boolean
  initialCount: number
  signedIn: boolean
  locale: 'en' | 'ar'
  size?: 'sm' | 'md'
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [pending, startTransition] = useTransition()

  const iconClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  const textClass = size === 'sm' ? 'text-[11px]' : 'text-xs'

  if (!signedIn) {
    return (
      <a
        href={`/${locale}/sign-in`}
        className={cn(
          'inline-flex items-center gap-1.5 text-fg-muted transition-colors hover:text-fg',
          textClass,
        )}
      >
        <Heart className={iconClass} />
        {count}
      </a>
    )
  }

  const onClick = () => {
    // Optimistic — flip immediately.
    const next = !liked
    setLiked(next)
    setCount((c) => Math.max(0, c + (next ? 1 : -1)))
    startTransition(async () => {
      try {
        const result = await toggleLikeAction({ postId })
        setLiked(result.liked)
        setCount(result.likeCount)
      } catch {
        // Roll back on failure.
        setLiked(liked)
        setCount(initialCount)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
      className={cn(
        'inline-flex items-center gap-1.5 transition-colors',
        liked ? 'text-rose-400 hover:text-rose-300' : 'text-fg-muted hover:text-fg',
        textClass,
      )}
    >
      <Heart
        className={cn(iconClass, 'transition-transform', liked && 'fill-current scale-110')}
      />
      <span className="tabular-nums">{count}</span>
    </button>
  )
}
