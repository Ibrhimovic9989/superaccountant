import { MapPin, Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { ProfileView } from '@/lib/community/types'
import { FollowButton } from './follow-button'
import { Sticker } from './su/primitives'

/**
 * Neobrutal profile header. Chunky ink-bordered cover with a solid
 * tone gradient, oversized avatar tile stitched on top with its own
 * hard shadow, big display name + verified sticker, headline and
 * bio, then the counts row as three little stat blocks.
 */

// Tone → cover gradient using the neobrutal palette. Each tone
// leads with its brand hue and drifts to a neighbour so covers
// feel varied without breaking the palette rules.
const TONE_GRADIENTS: Record<string, string> = {
  accent: 'bg-gradient-to-br from-brand via-brand to-grape',
  brand: 'bg-gradient-to-br from-brand via-sky to-mint',
  grape: 'bg-gradient-to-br from-grape via-brand to-sky',
  coral: 'bg-gradient-to-br from-coral via-blush to-butter',
  mint: 'bg-gradient-to-br from-mint via-sky to-brand',
  blush: 'bg-gradient-to-br from-blush via-butter to-coral',
  ink: 'bg-gradient-to-br from-ink via-grape to-brand',
}

export function ProfileHeader({
  view,
  locale,
  viewerId,
}: {
  view: ProfileView
  locale: 'en' | 'ar'
  viewerId: string | null
}) {
  const { author, bio, coverImageUrl, followerCount, followingCount, postCount } = view
  const gradient = TONE_GRADIENTS[author.tone] ?? TONE_GRADIENTS.accent

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-ink bg-white shadow-pop">
      {/* Cover */}
      <div className={`relative h-40 w-full ${gradient} sm:h-52`}>
        {coverImageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={coverImageUrl}
            alt=""
            className="h-full w-full object-cover opacity-80"
          />
        )}
        <span className="absolute end-4 top-4">
          <Sticker tone="butter" rotate="6deg">
            {author.headline?.includes('KSA') ? '🇸🇦 KSA' : '🇮🇳 India'}
          </Sticker>
        </span>
      </div>

      {/* Identity + actions */}
      <div className="relative px-5 pb-6 sm:px-8">
        <div className="-mt-16 flex items-end justify-between gap-4 sm:-mt-20">
          <Avatar author={author} />
          <div className="flex items-center gap-2">
            {view.viewerIsOwner ? (
              <Link
                href={`/${locale}/settings/profile`}
                className="rounded-full border-2 border-ink bg-white px-4 py-2 text-sm font-bold text-ink transition-all hover:-translate-y-0.5 hover:shadow-pop-xs"
              >
                Edit profile
              </Link>
            ) : (
              <FollowButton
                followedId={view.author.id}
                initialFollowing={view.viewerFollowing}
                signedIn={!!viewerId}
                locale={locale}
              />
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              {author.name}
            </h1>
            {author.verified && (
              <span
                aria-label="Verified"
                className="grid h-6 w-6 place-items-center rounded-full border-2 border-ink bg-brand text-xs font-black text-white"
              >
                ✓
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-sm font-bold text-ink/50">@{author.handle}</p>

          {author.headline && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-cream px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-ink shadow-pop-xs">
              <MapPin className="h-3 w-3" />
              {author.headline}
            </div>
          )}

          {bio && (
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink/70">{bio}</p>
          )}

          {/* Counts row */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <StatChip label="posts" value={postCount} tone="brand" />
            <StatChip label="followers" value={followerCount} tone="coral" />
            <StatChip label="following" value={followingCount} tone="mint" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'brand' | 'coral' | 'mint'
}) {
  const bg = { brand: 'bg-brand text-white', coral: 'bg-coral text-white', mint: 'bg-mint text-white' }[tone]
  return (
    <span className="inline-flex items-baseline gap-2 rounded-2xl border-2 border-ink bg-white px-3 py-2 shadow-pop-xs">
      <span className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-black tabular-nums ${bg}`}>
        {value}
      </span>
      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink/70">
        {label}
      </span>
    </span>
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
      <div
        style={{ rotate: '-4deg' }}
        className="grid h-28 w-28 place-items-center overflow-hidden rounded-3xl border-4 border-ink bg-cream text-3xl font-black text-ink shadow-pop sm:h-32 sm:w-32"
      >
        {author.avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={author.avatarUrl}
            alt={`${author.name}'s avatar`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initials || <Sparkles className="h-8 w-8" />}</span>
        )}
      </div>
    </div>
  )
}
