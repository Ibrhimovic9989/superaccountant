'use client'

import {
  BadgeCheck,
  MessageCircle,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { FeedPostView } from '@/lib/community/types'
import { LikeButton } from './like-button'

/**
 * One full-viewport reel — video underneath, overlay UI on top.
 *
 * Autoplay-on-visible using IntersectionObserver with a 0.7
 * threshold so a reel only starts once it's dominantly in view
 * (prevents two clips playing at once during a snap-scroll).
 *
 * Mute state is component-owned; the parent doesn't drive it.
 * Tap anywhere on the video toggles play/pause; the volume chip in
 * the corner toggles mute.
 */
export function ReelPlayer({
  post,
  locale,
  signedIn,
}: {
  post: FeedPostView
  locale: 'en' | 'ar'
  signedIn: boolean
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [muted, setMuted] = useState(true)
  const [paused, setPaused] = useState(false)
  const [showPauseChrome, setShowPauseChrome] = useState(false)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.play()
              .then(() => setPaused(false))
              .catch(() => {
                // Autoplay blocked (rare when muted); noop.
              })
          } else {
            el.pause()
            setPaused(true)
          }
        }
      },
      { threshold: 0.7 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const toggle = () => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      el.play().catch(() => {})
      setPaused(false)
      setShowPauseChrome(false)
    } else {
      el.pause()
      setPaused(true)
      setShowPauseChrome(true)
    }
  }

  return (
    <article className="relative h-[100dvh] w-full snap-start bg-black">
      {/* Video */}
      <video
        ref={videoRef}
        src={post.mediaUrl!}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onClick={toggle}
        className="absolute inset-0 h-full w-full object-contain sm:object-cover"
      />

      {/* Pause chrome (only shown when the user pauses via tap) */}
      {showPauseChrome && paused && (
        <button
          type="button"
          onClick={toggle}
          className="absolute inset-0 grid place-items-center bg-black/20"
          aria-label="Play"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-white/15 backdrop-blur-md">
            <Play className="h-7 w-7 fill-white text-white" />
          </span>
        </button>
      )}

      {/* Top gradient — carries author strip */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
      {/* Bottom gradient — carries caption */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />

      {/* Author strip (top) */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4 sm:p-5">
        <Link
          href={`/${locale}/u/${post.author.handle}`}
          className="group inline-flex min-w-0 items-center gap-3 text-white"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/40 bg-black/40 text-sm font-semibold">
            {post.author.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={post.author.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{(post.author.name || post.author.handle).slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">{post.author.name}</span>
              {post.author.verified && <BadgeCheck className="h-3.5 w-3.5 text-white" />}
            </div>
            <p className="font-mono text-[10px] text-white/70">@{post.author.handle}</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setMuted((m) => !m)
          }}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md hover:bg-white/25"
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Right action rail — TikTok/Instagram style */}
      <div className="absolute bottom-24 end-3 flex flex-col items-center gap-4 text-white sm:end-5">
        <div className="flex flex-col items-center">
          <LikeButton
            postId={post.id}
            initialLiked={post.viewerLiked}
            initialCount={post.likeCount}
            signedIn={signedIn}
            locale={locale}
            variant="reel"
          />
        </div>
        <Link
          href={`/${locale}/p/${post.id}`}
          className="flex flex-col items-center gap-0.5"
          aria-label={`View ${post.commentCount} comments`}
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25">
            <MessageCircle className="h-5 w-5" />
          </span>
          <span className="text-[11px] font-medium tabular-nums">{post.commentCount}</span>
        </Link>
      </div>

      {/* Bottom caption block */}
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-4 pe-16 text-white sm:p-5 sm:pe-20">
        <p className="line-clamp-4 whitespace-pre-wrap text-[14px] leading-relaxed">
          {post.body}
        </p>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 5).map((t) => (
              <Link
                key={t}
                href={`/${locale}/tag/${t}`}
                className="font-mono text-[11px] text-white/85 hover:text-white"
              >
                #{t}
              </Link>
            ))}
          </div>
        )}
        {post.source.startsWith('auto:') && (
          <p className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-white/70">
            <BadgeCheck className="h-3 w-3" />
            Verified · {post.linkedEntityType ?? 'system'}
          </p>
        )}
      </div>

      {/* Corner play/pause hint (small, non-obtrusive) */}
      {paused && !showPauseChrome && (
        <span className="absolute bottom-4 start-4 grid h-7 w-7 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md">
          <Pause className="h-3.5 w-3.5" />
        </span>
      )}
    </article>
  )
}
