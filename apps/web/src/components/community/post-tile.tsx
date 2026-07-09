import { Play } from 'lucide-react'
import Link from 'next/link'
import { isVideoUrl } from '@/lib/community/media'
import type { FeedPostView, PostKind } from '@/lib/community/types'

/**
 * Square post tile — the profile-grid unit.
 *
 * Neobrutal treatment: 2px ink border, hard offset shadow, emoji +
 * kind label as a rotated corner sticker. Text posts use a kind-tinted
 * paper block; media posts show the image/video with an ink-tone
 * gradient at the bottom carrying the caption. Video posts get a
 * play chip in the corner.
 */

const KIND_PAPER: Record<PostKind, { paper: string; emoji: string; label: string }> = {
  win: { paper: 'bg-mint text-white', emoji: '🏆', label: 'Win' },
  tip: { paper: 'bg-brand text-white', emoji: '💡', label: 'Tip' },
  showcase: { paper: 'bg-grape text-white', emoji: '🎨', label: 'Show' },
  ask: { paper: 'bg-coral text-white', emoji: '💬', label: 'Ask' },
  milestone: { paper: 'bg-sky text-ink', emoji: '⭐', label: 'Milestone' },
}

export function PostTile({
  post,
  locale,
}: {
  post: FeedPostView
  locale: 'en' | 'ar'
}) {
  const meta = KIND_PAPER[post.kind]
  const isVideo = post.mediaUrl ? isVideoUrl(post.mediaUrl) : false

  return (
    <Link
      href={`/${locale}/p/${post.id}`}
      className="group relative block aspect-square overflow-hidden rounded-2xl border-2 border-ink bg-white shadow-pop-sm transition-all hover:-translate-y-0.5 hover:shadow-pop-md active:translate-y-[2px] active:shadow-pop-xs"
    >
      {post.mediaUrl ? (
        <>
          {isVideo ? (
            <video
              src={`${post.mediaUrl}#t=0.1`}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={post.mediaUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          <span
            style={{ rotate: '-3deg' }}
            className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border-2 border-ink px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide shadow-pop-xs ${meta.paper}`}
          >
            {meta.emoji} {meta.label}
          </span>
          {isVideo && (
            <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border-2 border-ink bg-white text-ink shadow-pop-xs">
              <Play className="h-3 w-3 fill-current" />
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink/85 to-transparent" />
          <p className="absolute inset-x-2 bottom-2 line-clamp-2 text-[11px] font-bold text-white">
            {post.body}
          </p>
        </>
      ) : (
        <div className={`flex h-full w-full flex-col justify-between p-3 ${meta.paper}`}>
          <div className="flex items-center justify-between">
            <span
              style={{ rotate: '-4deg' }}
              className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-cream px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-ink shadow-pop-xs"
            >
              {meta.emoji} {meta.label}
            </span>
          </div>
          <p className="line-clamp-5 font-display text-[13px] font-extrabold leading-snug">
            {post.body}
          </p>
          <div className="flex items-center justify-between font-mono text-[10px] font-bold">
            <span>♡ {post.likeCount}</span>
            <span>💬 {post.commentCount}</span>
          </div>
        </div>
      )}
    </Link>
  )
}
