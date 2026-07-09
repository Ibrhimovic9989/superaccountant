import { BadgeCheck, MapPin, Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { ProfileView } from '@/lib/community/types'

/**
 * The top slab of a profile page. Cover image (falls back to a tone-
 * coloured gradient), avatar, name + handle + verified pip, headline
 * derived from track + certification, follower/following/post counts,
 * bio, and the primary action (Follow if signed-in-viewer, Edit if
 * owner).
 *
 * All non-interactive; the Follow button is a form action wired up in
 * a client child so the header stays server-rendered for SEO.
 */

// Gradient palettes routed through the brand hues: royal blue,
// emerald, warm orange. Each tone starts on-brand and drifts to a
// neighbour so covers feel varied without ever going off-palette.
const TONE_GRADIENTS: Record<string, string> = {
  accent: 'from-blue-600/35 via-indigo-500/20 to-sky-500/30',
  brand:  'from-blue-700/35 via-cyan-500/20 to-emerald-500/30',
  grape:  'from-indigo-600/35 via-violet-500/20 to-blue-500/30',
  coral:  'from-orange-500/35 via-amber-500/20 to-rose-500/30',
  mint:   'from-emerald-500/35 via-teal-500/20 to-cyan-500/30',
  blush:  'from-rose-500/30 via-amber-500/20 to-orange-500/30',
  ink:    'from-slate-800/50 via-blue-900/30 to-slate-900/50',
}

export function ProfileHeader({
  view,
  locale,
}: {
  view: ProfileView
  locale: 'en' | 'ar'
}) {
  const { author, bio, coverImageUrl, followerCount, followingCount, postCount } = view
  const gradient = TONE_GRADIENTS[author.tone] ?? TONE_GRADIENTS.accent

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-bg-elev">
      {/* Cover */}
      <div className={`relative h-40 w-full bg-gradient-to-br ${gradient} sm:h-52`}>
        {coverImageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={coverImageUrl}
            alt=""
            className="h-full w-full object-cover opacity-70"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg-elev/80" />
      </div>

      {/* Identity + actions */}
      <div className="relative px-5 pb-6 sm:px-8">
        <div className="-mt-14 flex items-end justify-between gap-4 sm:-mt-16">
          <Avatar author={author} />
          <div className="flex items-center gap-2">
            {view.viewerIsOwner ? (
              <Link
                href={`/${locale}/settings/profile`}
                className="rounded-full border border-border bg-bg px-4 py-1.5 text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
              >
                Edit profile
              </Link>
            ) : (
              // TODO(week 2): FollowButton — client action that toggles
              // the follow state via a server action and refreshes the
              // count in place. Kept as a placeholder link for now so
              // the header ships in this slice.
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-full bg-accent/30 px-4 py-1.5 text-sm font-medium text-accent-fg opacity-70"
              >
                {view.viewerFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {author.name}
            </h1>
            {author.verified && (
              <BadgeCheck className="h-5 w-5 text-accent" aria-label="Verified member" />
            )}
          </div>
          <p className="mt-1 font-mono text-sm text-fg-subtle">@{author.handle}</p>

          {author.headline && (
            <div className="mt-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
              <MapPin className="h-3 w-3" />
              {author.headline}
            </div>
          )}

          {bio && <p className="mt-4 text-sm leading-relaxed text-fg-muted">{bio}</p>}

          {/* Counts row */}
          <div className="mt-6 flex flex-wrap items-baseline gap-6 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            <div>
              <span className="text-lg font-semibold tabular-nums text-fg sm:text-xl">
                {postCount}
              </span>{' '}
              posts
            </div>
            <div>
              <span className="text-lg font-semibold tabular-nums text-fg sm:text-xl">
                {followerCount}
              </span>{' '}
              followers
            </div>
            <div>
              <span className="text-lg font-semibold tabular-nums text-fg sm:text-xl">
                {followingCount}
              </span>{' '}
              following
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Avatar({ author }: { author: ProfileView['author'] }) {
  const initials = (author.name || author.handle)
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div className="relative">
      <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-3xl border-4 border-bg-elev bg-bg-overlay text-2xl font-semibold shadow-lg shadow-black/40 sm:h-32 sm:w-32">
        {author.avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={author.avatarUrl}
            alt={`${author.name}'s avatar`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initials || <Sparkles className="h-8 w-8 text-fg-subtle" />}</span>
        )}
      </div>
    </div>
  )
}
