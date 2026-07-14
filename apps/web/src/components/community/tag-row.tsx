'use client'

import Link from 'next/link'

/**
 * Row of tag chips at the bottom of a FeedCard.
 *
 * Client component because the chips sit *inside* the outer
 * "open post" Link on media-first cards — clicking a tag needs to
 * stop propagation so we navigate to /tag/{t} instead of the post
 * detail. Event handlers can't be serialised into a Server Component
 * tree, so the whole row lives here.
 */
export function TagRow({ tags, locale }: { tags: string[]; locale: 'en' | 'ar' }) {
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
