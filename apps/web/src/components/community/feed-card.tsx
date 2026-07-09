import {
  Award,
  BadgeCheck,
  HelpCircle,
  ImageIcon,
  Lightbulb,
  MessageCircle,
  Trophy,
} from 'lucide-react'
import Link from 'next/link'
import type { FeedPostView, PostKind } from '@/lib/community/types'
import { LikeButton } from './like-button'

/**
 * Feed card — Instagram-flavored on top of LinkedIn semantics.
 *
 * Two shapes, chosen by whether the post has media:
 *
 *   - IMAGE POSTS: hero the image edge-to-edge under the author strip.
 *     Actions row (heart, comment) sits directly under the image, IG
 *     style. Caption + kind chip go below the actions. This is the
 *     shape that makes the feed feel like a photo feed instead of a
 *     blog.
 *
 *   - TEXT POSTS: kind-tinted gradient card with the body as the
 *     "content". Still image-adjacent in weight thanks to the
 *     gradient wash, but doesn't require a photo.
 *
 * Auto-generated milestone posts get a "Verified via X" chip so
 * readers know it's a system attestation, not a user claim.
 */

const KIND_META: Record<PostKind, {
  label: string
  icon: typeof Trophy
  chip: string
  wash: string
}> = {
  win: {
    label: 'Win',
    icon: Trophy,
    chip: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    wash: 'from-emerald-500/25 via-blue-500/10 to-emerald-600/20',
  },
  tip: {
    label: 'Tip',
    icon: Lightbulb,
    chip: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
    wash: 'from-blue-500/25 via-cyan-500/10 to-blue-600/20',
  },
  showcase: {
    label: 'Showcase',
    icon: ImageIcon,
    chip: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30',
    wash: 'from-indigo-500/25 via-blue-500/10 to-indigo-600/20',
  },
  ask: {
    label: 'Ask',
    icon: HelpCircle,
    chip: 'text-orange-300 bg-orange-500/10 border-orange-500/30',
    wash: 'from-orange-500/25 via-amber-500/10 to-orange-600/20',
  },
  milestone: {
    label: 'Milestone',
    icon: Award,
    chip: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
    wash: 'from-blue-600/25 via-emerald-500/10 to-cyan-500/20',
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
  const hasImage = !!post.mediaUrl

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-bg-elev transition-colors hover:border-border-strong">
      {/* Author strip */}
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <Link
          href={`/${locale}/u/${post.author.handle}`}
          className="group inline-flex min-w-0 items-center gap-3"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-bg-overlay text-sm font-semibold">
            {post.author.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={post.author.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{(post.author.name || post.author.handle).slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1">
              <span className="truncate text-sm font-medium group-hover:text-accent">
                {post.author.name}
              </span>
              {post.author.verified && (
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="Verified" />
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
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${meta.chip}`}
        >
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
      </div>

      {hasImage ? (
        // ── IMAGE-FIRST LAYOUT ───────────────────────────────────
        <>
          <Link
            href={`/${locale}/p/${post.id}`}
            className="mt-3 block bg-bg-overlay"
            aria-label="Open post"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.mediaUrl!}
              alt={post.body.slice(0, 100)}
              loading="lazy"
              className="max-h-[560px] w-full object-cover"
            />
          </Link>

          <ActionRow
            post={post}
            signedIn={signedIn}
            locale={locale}
            isAuto={isAuto}
          />

          <Link href={`/${locale}/p/${post.id}`} className="block px-4 pb-4 sm:px-5 sm:pb-5">
            {post.likeCount > 0 && (
              <p className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
                {post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}
              </p>
            )}
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[14px] leading-relaxed text-fg">
              <span className="me-1.5 font-semibold">{post.author.name}</span>
              {post.body}
            </p>
            {post.commentCount > 0 && (
              <p className="mt-1.5 text-xs text-fg-subtle">
                View {post.commentCount === 1 ? '1 comment' : `all ${post.commentCount} comments`}
              </p>
            )}
            <TagRow tags={post.tags} />
          </Link>
        </>
      ) : (
        // ── TEXT-FIRST LAYOUT ────────────────────────────────────
        <>
          <Link
            href={`/${locale}/p/${post.id}`}
            className={`mx-4 mt-3 block rounded-xl bg-gradient-to-br p-5 ${meta.wash} sm:mx-5`}
          >
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-fg">
              {post.body}
            </p>
            <TagRow tags={post.tags} />
          </Link>

          <ActionRow
            post={post}
            signedIn={signedIn}
            locale={locale}
            isAuto={isAuto}
          />
        </>
      )}
    </article>
  )
}

function ActionRow({
  post,
  signedIn,
  locale,
  isAuto,
}: {
  post: FeedPostView
  signedIn: boolean
  locale: 'en' | 'ar'
  isAuto: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
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
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="tabular-nums text-xs">{post.commentCount}</span>
        </Link>
      </div>
      {isAuto && (
        <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
          <BadgeCheck className="h-3 w-3 text-accent" />
          Verified · {post.linkedEntityType ?? 'system'}
        </span>
      )}
    </div>
  )
}

function TagRow({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {tags.slice(0, 6).map((t) => (
        <span
          key={t}
          className="rounded-full border border-border bg-bg-overlay/70 px-2 py-0.5 font-mono text-[10px] text-fg-muted"
        >
          #{t}
        </span>
      ))}
    </div>
  )
}
