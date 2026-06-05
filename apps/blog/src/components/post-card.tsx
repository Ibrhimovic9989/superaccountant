import Link from 'next/link'
import { Clock, MapPin } from 'lucide-react'
import type { BlogPost } from '@/lib/blog/types'
import { marketLabel, readingTimeMinutes } from '@/lib/blog/format'

/**
 * Editorial card used on the home grid and the /tag listing. Designed
 * to be skimmable in a 3-up grid on desktop and a single column on
 * mobile.
 */
export function PostCard({ post }: { post: BlogPost }) {
  const minutes = readingTimeMinutes(post.contentEnMdx)
  return (
    <article className="group flex flex-col rounded-2xl border border-border bg-bg-elev p-6 transition-colors hover:border-border-strong hover:bg-bg-overlay">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-fg-muted">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {marketLabel(post.market)}
        </span>
        <span>·</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {minutes} min read
        </span>
      </div>
      <h3 className="text-xl font-semibold leading-snug">
        <Link href={`/${post.slug}`} className="hover:text-accent">
          {post.titleEn}
        </Link>
      </h3>
      {post.subtitleEn && (
        <p className="mt-2 line-clamp-3 text-sm text-fg-muted">{post.subtitleEn}</p>
      )}
      {post.targetKeywords.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {post.targetKeywords.slice(0, 3).map((kw) => (
            <Link
              key={kw}
              href={`/tag/${encodeURIComponent(kw)}`}
              className="inline-flex rounded-full border border-border bg-bg-overlay px-2.5 py-0.5 text-[11px] text-fg-muted hover:border-accent hover:text-accent"
            >
              {kw}
            </Link>
          ))}
        </div>
      )}
    </article>
  )
}
