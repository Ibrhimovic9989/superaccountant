import { Award, HelpCircle, ImageIcon, Lightbulb, MessageCircle, Trophy } from 'lucide-react'
import Link from 'next/link'
import { isVideoUrl } from '@/lib/community/media'
import type { FeedPostView, PostKind } from '@/lib/community/types'
import { BlurredImage } from './blurred-image'
import { FeedVideo } from './feed-video'
import { LikeButton } from './like-button'
import { Sticker } from './su/primitives'

/**
 * Neobrutal feed card.
 *
 * White paper, 2px ink border, hard offset shadow that grows on
 * hover. Kind indicated by a rotated sticker in the top-right —
 * emoji-forward. Media (image or video) sits edge-to-edge with its
 * own ink divider. Author strip up top, big body copy, action row
 * at the bottom.
 *
 * Two shapes underneath:
 *   - MEDIA POSTS: image/video hero right below the author strip.
 *   - TEXT POSTS: kind-tinted paper block with the body as the
 *     content — no photo required, still reads as a card.
 */

const KIND: Record<
  PostKind,
  {
    label: string
    emoji: string
    tone: 'mint' | 'coral' | 'grape' | 'brand' | 'sky'
    ring: string
    icon: typeof Trophy
  }
> = {
  win: { label: 'Win', emoji: '🏆', tone: 'mint', ring: 'ring-mint', icon: Trophy },
  tip: { label: 'Tip', emoji: '💡', tone: 'brand', ring: 'ring-brand', icon: Lightbulb },
  showcase: { label: 'Showcase', emoji: '🎨', tone: 'grape', ring: 'ring-grape', icon: ImageIcon },
  ask: { label: 'Ask', emoji: '💬', tone: 'coral', ring: 'ring-coral', icon: HelpCircle },
  milestone: { label: 'Milestone', emoji: '⭐', tone: 'sky', ring: 'ring-sky', icon: Award },
}

const KIND_PAPER: Record<PostKind, string> = {
  win: 'bg-mint/10',
  tip: 'bg-brand/10',
  showcase: 'bg-grape/10',
  ask: 'bg-coral/10',
  milestone: 'bg-sky/20',
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
  const meta = KIND[post.kind]
  const isAuto = post.source.startsWith('auto:')
  const hasMedia = !!post.mediaUrl
  const isVideo = hasMedia && isVideoUrl(post.mediaUrl)

  return (
    <article className="relative overflow-hidden rounded-3xl border-2 border-ink bg-white shadow-pop-md transition-transform hover:-translate-y-1 hover:shadow-pop">
      {/* Sticker in the top-right */}
      <div className="pointer-events-none absolute end-3 top-3 z-10">
        <Sticker tone={meta.tone} rotate="4deg">
          {meta.emoji} {meta.label}
        </Sticker>
      </div>

      {/* Author strip */}
      <div className="flex items-center gap-3 px-5 pt-5 pe-24">
        <Link
          href={`/${locale}/u/${post.author.handle}`}
          className="group inline-flex min-w-0 items-center gap-3"
        >
          <span className={`relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-ink bg-cream text-lg font-extrabold text-ink`}>
            {post.author.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={post.author.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{(post.author.name || post.author.handle).slice(0, 1).toUpperCase()}</span>
            )}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-display text-base font-extrabold text-ink group-hover:text-brand">
                {post.author.name}
              </span>
              {post.author.verified && (
                <span
                  aria-label="Verified"
                  className="grid h-4 w-4 place-items-center rounded-full border-2 border-ink bg-brand text-[9px] font-black text-white"
                >
                  ✓
                </span>
              )}
            </span>
            <span className="block truncate text-[12px] font-medium text-ink/55">
              @{post.author.handle}
              {post.author.headline && (
                <>
                  <span className="mx-1 text-ink/30">·</span>
                  {post.author.headline}
                </>
              )}
              <span className="mx-1 text-ink/30">·</span>
              {timeAgo(post.publishedAt)}
            </span>
          </span>
        </Link>
      </div>

      {hasMedia ? (
        // ── MEDIA-FIRST LAYOUT ───────────────────────────────────
        <>
          <div className="mt-4 border-y-2 border-ink bg-cream">
            {isVideo ? (
              <FeedVideo src={post.mediaUrl!} />
            ) : (
              <Link
                href={`/${locale}/p/${post.id}`}
                className="block max-h-[560px]"
                aria-label="Open post"
              >
                <BlurredImage
                  src={post.mediaUrl!}
                  blurhash={post.mediaBlurhash}
                  alt={post.body.slice(0, 100)}
                  className="max-h-[560px] w-full"
                />
              </Link>
            )}
          </div>

          <ActionRow post={post} signedIn={signedIn} locale={locale} isAuto={isAuto} />

          <Link href={`/${locale}/p/${post.id}`} className="block px-5 pb-5">
            {post.likeCount > 0 && (
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink/60">
                {post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}
              </p>
            )}
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
              <span className="me-1.5 font-extrabold">{post.author.name}</span>
              {post.body}
            </p>
            {post.commentCount > 0 && (
              <p className="mt-1.5 text-xs font-semibold text-ink/50 hover:text-ink">
                View {post.commentCount === 1 ? '1 comment' : `all ${post.commentCount} comments`}
              </p>
            )}
            <TagRow tags={post.tags} locale={locale} />
          </Link>
        </>
      ) : (
        // ── TEXT-FIRST LAYOUT ────────────────────────────────────
        <>
          <Link
            href={`/${locale}/p/${post.id}`}
            className={`mx-5 mt-4 block rounded-2xl border-2 border-ink px-5 py-6 ${KIND_PAPER[post.kind]}`}
          >
            <p className="whitespace-pre-wrap font-display text-[18px] font-bold leading-snug text-ink">
              {post.body}
            </p>
            <TagRow tags={post.tags} locale={locale} />
          </Link>

          <ActionRow post={post} signedIn={signedIn} locale={locale} isAuto={isAuto} />
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
    <div className="flex items-center justify-between gap-3 border-t-2 border-ink/10 px-5 py-3">
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
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 transition-colors hover:text-ink"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="tabular-nums">{post.commentCount}</span>
        </Link>
      </div>
      {isAuto && (
        <Sticker tone="ink" rotate="-2deg" size="sm">
          ✓ Verified
        </Sticker>
      )}
    </div>
  )
}

function TagRow({ tags, locale }: { tags: string[]; locale: 'en' | 'ar' }) {
  if (tags.length === 0) return null
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {tags.slice(0, 6).map((t) => (
        <Link
          key={t}
          href={`/${locale}/tag/${t}`}
          onClick={(e) => e.stopPropagation()}
          className="rounded-full border-2 border-ink bg-white px-2.5 py-0.5 font-mono text-[10px] font-bold text-ink hover:bg-brand hover:text-white"
        >
          #{t}
        </Link>
      ))}
    </div>
  )
}
