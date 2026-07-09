import Link from 'next/link'
import type { ActiveAuthor } from '@/lib/community/feed-store'
import type { PostKind } from '@/lib/community/types'

/**
 * "Active this week" avatar rail on /community.
 *
 * Each chip is a distinct author who posted in the last 7 days, with
 * a chunky ink-bordered avatar tile + name + emoji tag pinned to
 * their most-recent post kind. Scrolls horizontally on mobile.
 *
 * Zero-effort social proof — the moment a student posts, they show
 * up here.
 */

const KIND: Record<PostKind, { emoji: string; ring: string }> = {
  milestone: { emoji: '⭐', ring: 'bg-sky' },
  win: { emoji: '🏆', ring: 'bg-mint' },
  showcase: { emoji: '🎨', ring: 'bg-grape' },
  tip: { emoji: '💡', ring: 'bg-brand' },
  ask: { emoji: '💬', ring: 'bg-coral' },
}

// Rotate each avatar tile a tiny random-ish amount to give the rail
// that hand-placed "sticker book" feel. Deterministic based on the
// user id so re-renders don't jump.
function rotationFor(id: string): string {
  let sum = 0
  for (const ch of id) sum += ch.charCodeAt(0)
  const rotations = ['-3deg', '-2deg', '-1deg', '1deg', '2deg', '3deg']
  return rotations[sum % rotations.length]!
}

export function StoryRow({
  authors,
  locale,
}: {
  authors: ActiveAuthor[]
  locale: 'en' | 'ar'
}) {
  if (authors.length === 0) return null
  return (
    <div className="mb-6 rounded-2xl border-2 border-ink bg-white p-4 shadow-pop-md">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink/60">
          🔥 Active this week
        </p>
        <p className="hidden font-mono text-[10px] font-bold uppercase tracking-wider text-ink/40 sm:block">
          who&apos;s posting
        </p>
      </div>
      <div className="-mx-1 flex items-start gap-3 overflow-x-auto pb-1">
        {authors.map((a) => (
          <StoryChip key={a.userId} author={a} locale={locale} />
        ))}
      </div>
    </div>
  )
}

function StoryChip({ author, locale }: { author: ActiveAuthor; locale: 'en' | 'ar' }) {
  const kind = KIND[author.mostRecentKind]
  const initial = (author.name || author.handle).slice(0, 1).toUpperCase()
  return (
    <Link
      href={`/${locale}/u/${author.handle}`}
      className="group flex w-16 shrink-0 flex-col items-center gap-1.5 text-center"
      aria-label={`${author.name} — most recent post: ${author.mostRecentKind}`}
    >
      <span
        style={{ rotate: rotationFor(author.userId) }}
        className="relative rounded-2xl border-2 border-ink bg-cream shadow-pop-sm transition-transform group-hover:-translate-y-0.5 group-hover:shadow-pop-md"
      >
        <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl text-lg font-extrabold text-ink">
          {author.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={author.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span>{initial}</span>
          )}
        </span>
        <span
          className={`absolute -bottom-1.5 -end-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-ink text-[10px] ${kind.ring}`}
        >
          {kind.emoji}
        </span>
      </span>
      <span className="w-16 truncate font-mono text-[10px] font-bold text-ink group-hover:text-brand">
        {author.name.split(/\s+/)[0]}
      </span>
    </Link>
  )
}
