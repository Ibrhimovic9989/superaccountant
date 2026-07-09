import { Award, HelpCircle, ImageIcon, Lightbulb, Trophy } from 'lucide-react'
import Link from 'next/link'
import type { ActiveAuthor } from '@/lib/community/feed-store'
import type { PostKind } from '@/lib/community/types'

/**
 * Instagram-style "who's active this week" avatar rail at the top of
 * /community. Each chip is a distinct author who posted recently,
 * ringed by a gradient tinted by their most recent post's kind —
 * so the strip instantly signals "someone hit a milestone", "someone
 * asked a question", etc.
 *
 * Scrolls horizontally on mobile. Zero-effort social proof: the
 * moment a student posts, they appear here.
 */

// Kind → ring gradient. Kept in-file so the rail's visual language
// is self-contained; it doesn't need to match feed cards 1:1.
const RING: Record<PostKind, { from: string; to: string; icon: typeof Trophy; label: string }> = {
  milestone: { from: 'from-blue-400', to: 'to-emerald-400', icon: Award, label: 'Milestone' },
  win: { from: 'from-emerald-400', to: 'to-blue-400', icon: Trophy, label: 'Win' },
  showcase: { from: 'from-indigo-400', to: 'to-cyan-400', icon: ImageIcon, label: 'Showcase' },
  tip: { from: 'from-blue-400', to: 'to-cyan-300', icon: Lightbulb, label: 'Tip' },
  ask: { from: 'from-orange-400', to: 'to-amber-300', icon: HelpCircle, label: 'Ask' },
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
    <div className="-mx-1 mb-4 flex items-start gap-3 overflow-x-auto pb-2 sm:mb-6">
      {authors.map((a) => (
        <StoryChip key={a.userId} author={a} locale={locale} />
      ))}
    </div>
  )
}

function StoryChip({ author, locale }: { author: ActiveAuthor; locale: 'en' | 'ar' }) {
  const ring = RING[author.mostRecentKind]
  const Icon = ring.icon
  const initial = (author.name || author.handle).slice(0, 1).toUpperCase()
  return (
    <Link
      href={`/${locale}/u/${author.handle}`}
      className="group flex w-16 shrink-0 flex-col items-center gap-1.5 text-center"
      aria-label={`${author.name} — most recent post: ${ring.label}`}
    >
      <div
        className={`relative rounded-full bg-gradient-to-tr ${ring.from} ${ring.to} p-[2px] transition-transform group-hover:scale-105`}
      >
        <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full border-2 border-bg bg-bg-elev text-sm font-semibold text-fg">
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
        </div>
        <span className="absolute -bottom-0.5 -end-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-bg bg-bg-elev text-fg">
          <Icon className="h-2.5 w-2.5" />
        </span>
      </div>
      <span className="w-16 truncate font-mono text-[10px] text-fg-muted group-hover:text-fg">
        {author.name.split(/\s+/)[0]}
      </span>
    </Link>
  )
}
