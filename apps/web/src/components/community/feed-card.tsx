import { Award, HelpCircle, ImageIcon, Lightbulb, MessageSquare, Trophy } from 'lucide-react'
import Link from 'next/link'
import type { FeedPostView, PostKind } from '@/lib/community/types'
import { LikeButton } from './like-button'

/**
 * Full-width feed card — the format used on /community and inside a
 * post detail page. Bigger than the profile grid tile so the body
 * reads properly and reactions are easy to tap.
 *
 * Auto-generated milestone posts get a small "Verified via X" chip
 * so the reader can tell it's a system attestation rather than a
 * user claim.
 */

const KIND_META: Record<PostKind, { label: string; icon: typeof Trophy; tone: string }> = {
  win: { label: 'Win', icon: Trophy, tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
  tip: { label: 'Tip', icon: Lightbulb, tone: 'text-blue-300 bg-blue-500/10 border-blue-500/30' },
  showcase: {
    label: 'Showcase',
    icon: ImageIcon,
    tone: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30',
  },
  ask: { label: 'Ask', icon: HelpCircle, tone: 'text-orange-300 bg-orange-500/10 border-orange-500/30' },
  milestone: {
    label: 'Milestone',
    icon: Award,
    tone: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
  },
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  const min = Math.round((Date.now() - t) / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function FeedCard({
  post,
  locale,
  signedIn,
}: {
  post: FeedPostView
  locale: 'en' | 'ar'
  signedIn: boolean
}) {
  const meta = KIND_META[post.kind]
  const Icon = meta.icon
  const isAuto = post.source.startsWith('auto:')

  return (
    <article className="rounded-2xl border border-border bg-bg-elev p-5 transition-colors hover:border-border-strong sm:p-6">
      {/* Author row */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/${locale}/u/${post.author.handle}`}
          className="group inline-flex items-center gap-3"
        >
          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-border bg-bg-overlay text-sm font-semibold">
            {post.author.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={post.author.avatarUrl}
                alt={`${post.author.name}'s avatar`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{(post.author.name || post.author.handle).slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium group-hover:text-accent">
                {post.author.name}
              </span>
              {post.author.verified && (
                <span
                  aria-label="verified"
                  className="text-accent"
                  title="Verified member"
                >
                  ●
                </span>
              )}
            </div>
            <p className="truncate font-mono text-[11px] text-fg-subtle">
              @{post.author.handle}
              {post.author.headline && (
                <>
                  <span className="mx-1 text-fg-subtle/60">·</span>
                  {post.author.headline}
                </>
              )}
              <span className="mx-1 text-fg-subtle/60">·</span>
              {timeAgo(post.publishedAt)}
            </p>
          </div>
        </Link>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${meta.tone}`}
        >
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
      </div>

      {/* Body */}
      <Link href={`/${locale}/p/${post.id}`} className="mt-4 block">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-fg">
          {post.body}
        </p>
      </Link>

      {/* Media */}
      {post.mediaUrl && (
        <Link href={`/${locale}/p/${post.id}`} className="mt-4 block overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.mediaUrl} alt="" loading="lazy" className="w-full object-cover" />
        </Link>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 6).map((t) => (
            <span
              key={t}
              className="rounded-full border border-border bg-bg-overlay px-2 py-0.5 font-mono text-[10px] text-fg-muted"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-5">
          <LikeButton
            postId={post.id}
            initialLiked={post.viewerLiked}
            initialCount={post.likeCount}
            signedIn={signedIn}
            locale={locale}
          />
          <Link
            href={`/${locale}/p/${post.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="tabular-nums">{post.commentCount}</span>
          </Link>
        </div>
        {isAuto && (
          <span className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
            Verified via {post.linkedEntityType ?? 'system'}
          </span>
        )}
      </div>
    </article>
  )
}
