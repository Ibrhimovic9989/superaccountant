import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Clock, MapPin } from 'lucide-react'
import type { BlogPost } from '@/lib/blog/types'
import { marketLabel, readingTimeMinutes, relativeDate } from '@/lib/blog/format'
import { CtaStrip } from './cta-strip'
import { PostCard } from './post-card'

/**
 * Rendered article body — split out from the route so the route stays
 * small and so admin previews can reuse it. Renders Markdown via
 * react-markdown + remark-gfm (same pattern as
 * apps/web/src/components/lesson/lesson-content.tsx).
 */
export function ArticleView({
  post,
  related,
}: {
  post: BlogPost
  related: BlogPost[]
}) {
  const minutes = readingTimeMinutes(post.contentEnMdx)
  const dateLabel = post.publishedAt
    ? relativeDate(post.publishedAt)
    : relativeDate(post.createdAt)

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <article>
        <header className="mb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {marketLabel(post.market)}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {minutes} min read
            </span>
            <span>·</span>
            <span>{dateLabel}</span>
          </div>
          <h1 className="font-headline text-3xl font-semibold leading-tight sm:text-4xl">
            {post.titleEn}
          </h1>
          {post.subtitleEn && (
            <p className="mt-3 text-lg text-fg-muted">{post.subtitleEn}</p>
          )}
          <p className="mt-5 text-sm text-fg-muted">
            By the <span className="font-medium text-fg">SuperAccountant Editorial Team</span>
          </p>
        </header>

        {post.heroImageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={post.heroImageUrl}
            alt=""
            className="mb-8 w-full rounded-2xl border border-border"
          />
        )}

        <div className="article-prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.contentEnMdx}</ReactMarkdown>
        </div>

        {post.targetKeywords.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {post.targetKeywords.map((kw) => (
              <Link
                key={kw}
                href={`/tag/${encodeURIComponent(kw)}`}
                className="inline-flex rounded-full border border-border bg-bg-soft px-3 py-1 text-xs text-fg-muted hover:border-accent hover:text-accent"
              >
                #{kw}
              </Link>
            ))}
          </div>
        )}
      </article>

      <section className="mt-12">
        <CtaStrip market={post.market} />
      </section>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-5 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
            Keep reading
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <PostCard key={r.id} post={r} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
