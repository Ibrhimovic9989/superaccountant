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
  variant = 'inline',
}: {
  postId: string
  initialLiked: boolean
  initialCount: number
  signedIn: boolean
  locale: 'en' | 'ar'
  size?: 'sm' | 'md'
  /**
   * 'inline' — the default row layout used in feed cards.
   * 'reel'   — vertical stack for the reels action rail: circular
   *            chip with the count directly beneath it.
   */
  variant?: 'inline' | 'reel'
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [pending, startTransition] = useTransition()

  const iconClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  const textClass = size === 'sm' ? 'text-[11px]' : 'text-xs'

  // Reels variant is its own visual container — a circular chip with
  // the count underneath. Kept in the same component so the optimistic
  // logic lives in one place.
  if (variant === 'reel') {
    const inner = (
      <>
        <span
          className={cn(
            'grid h-10 w-10 place-items-center rounded-full backdrop-blur-md transition-colors',
            liked ? 'bg-rose-500 text-white' : 'bg-white/15 text-white hover:bg-white/25',
          )}
        >
          <Heart className={cn('h-5 w-5', liked && 'fill-current')} />
        </span>
        <span className="mt-0.5 text-[11px] font-medium tabular-nums text-white">{count}</span>
      </>
    )
    if (!signedIn) {
      return (
        <a href={`/${locale}/sign-in`} className="flex flex-col items-center gap-0.5">
          {inner}
        </a>
      )
    }
    return (
      <button
        type="button"
        onClick={() => {
          const next = !liked
          setLiked(next)
          setCount((c) => Math.max(0, c + (next ? 1 : -1)))
          startTransition(async () => {
            try {
              const result = await toggleLikeAction({ postId })
              setLiked(result.liked)
              setCount(result.likeCount)
            } catch {
              setLiked(liked)
              setCount(initialCount)
            }
          })
        }}
        disabled={pending}
        aria-pressed={liked}
        aria-label={liked ? 'Unlike' : 'Like'}
        className="flex flex-col items-center gap-0.5"
      >
        {inner}
      </button>
    )
  }

  if (!signedIn) {
    return (
      <a
        href={`/${locale}/sign-in`}
        className={cn(
          'inline-flex items-center gap-1.5 font-semibold text-ink/60 transition-colors hover:text-ink',
          textClass,
        )}
      >
        <Heart className={iconClass} />
        <span className="tabular-nums">{count}</span>
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
        'inline-flex items-center gap-1.5 font-semibold transition-colors',
        liked ? 'text-coral' : 'text-ink/60 hover:text-ink',
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
