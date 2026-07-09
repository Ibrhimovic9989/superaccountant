import { Award, HelpCircle, ImageIcon, Lightbulb, Sparkles, Trophy } from 'lucide-react'
import Link from 'next/link'
import type { FeedPostView, PostKind } from '@/lib/community/types'

/**
 * Square post tile — the Instagram-style grid unit on a profile.
 *
 * When the post has media it renders as a photo tile with a subtle
 * gradient overlay + kind badge. When it doesn't, it renders as a
 * text tile with a big kind emoji + line-clamped body. This mixed
 * grid — media-heavy and text-heavy tiles side by side — is what
 * gives the page its "LinkedIn in Instagram clothing" feel without
 * making every post require a photo.
 */

const KIND_META: Record<PostKind, { label: string; icon: typeof Sparkles; tone: string }> = {
  win: {
    label: 'Win',
    icon: Trophy,
    tone: 'from-amber-500/25 via-orange-500/15 to-rose-500/25 text-amber-100',
  },
  tip: {
    label: 'Tip',
    icon: Lightbulb,
    tone: 'from-cyan-500/25 via-teal-500/15 to-emerald-500/25 text-cyan-100',
  },
  showcase: {
    label: 'Showcase',
    icon: ImageIcon,
    tone: 'from-violet-500/25 via-fuchsia-500/15 to-pink-500/25 text-violet-100',
  },
  ask: {
    label: 'Ask',
    icon: HelpCircle,
    tone: 'from-rose-500/25 via-pink-500/15 to-fuchsia-500/25 text-rose-100',
  },
  milestone: {
    label: 'Milestone',
    icon: Award,
    tone: 'from-emerald-500/25 via-teal-500/15 to-cyan-500/25 text-emerald-100',
  },
}

export function PostTile({
  post,
  locale,
}: {
  post: FeedPostView
  locale: 'en' | 'ar'
}) {
  const meta = KIND_META[post.kind]
  const Icon = meta.icon

  return (
    <Link
      href={`/${locale}/p/${post.id}`}
      className="group relative block aspect-square overflow-hidden rounded-xl border border-border bg-bg-overlay transition-transform hover:-translate-y-0.5 hover:border-border-strong"
    >
      {post.mediaUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.mediaUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
          <KindBadge kind={post.kind} className="absolute left-2 top-2" />
          <p className="absolute inset-x-2 bottom-2 line-clamp-2 text-[11px] font-medium text-white/90">
            {post.body}
          </p>
        </>
      ) : (
        <div className={`flex h-full w-full flex-col justify-between bg-gradient-to-br p-3 ${meta.tone}`}>
          <div className="flex items-center justify-between">
            <Icon className="h-5 w-5 opacity-90" />
            <span className="rounded-full bg-black/25 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider">
              {meta.label}
            </span>
          </div>
          <p className="line-clamp-5 text-[12px] font-medium leading-snug">
            {post.body}
          </p>
          <div className="flex items-center justify-between font-mono text-[10px] opacity-80">
            <span>♡ {post.likeCount}</span>
            <span>💬 {post.commentCount}</span>
          </div>
        </div>
      )}
    </Link>
  )
}

function KindBadge({ kind, className = '' }: { kind: PostKind; className?: string }) {
  const meta = KIND_META[kind]
  const Icon = meta.icon
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white ${className}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  )
}
