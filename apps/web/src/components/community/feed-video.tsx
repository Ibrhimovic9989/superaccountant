'use client'

import { Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * Inline reels-style video for the feed.
 *
 * Autoplays muted when >=50% visible (IntersectionObserver), pauses
 * when scrolled out. Loops. Tapping the volume chip toggles mute.
 *
 * Deliberately does NOT show native controls — a controls bar
 * fighting the feed's click-to-open-detail is bad UX. If the user
 * wants finer control, they open the post detail page.
 */
export function FeedVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement | null>(null)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.play().catch(() => {
              // Autoplay blocked (rare when muted) — noop; user tap will unblock.
            })
          } else {
            el.pause()
          }
        }
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="relative bg-black">
      <video
        ref={ref}
        src={src}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        className="mx-auto max-h-[560px] w-full object-contain"
      />
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setMuted((m) => !m)
        }}
        className="absolute bottom-3 end-3 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-opacity hover:bg-black/70"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  )
}
