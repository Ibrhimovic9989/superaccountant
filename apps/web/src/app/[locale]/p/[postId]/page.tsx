import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CommunityNav } from '@/components/community/community-nav'
import { getPostById, listComments } from '@/lib/community/feed-store'
import { FeedCard } from '@/components/community/feed-card'
import { CommentThread } from '@/components/community/comment-thread'
import { ViewerStateProvider } from '@/components/community/viewer-state'

/**
 * Public post detail. Reader lands here from the feed, a profile grid
 * tile, or a share link. Comments load with the page — no separate
 * request — so the perceived latency stays close to zero.
 *
 * Anonymous SSG so Google indexes the page. Ask posts especially are
 * long-tail SEO gold: a question + a good answer = a page that ranks.
 * Viewer state (heart filled/empty, comment composer signed-in-ness)
 * hydrates on the client via ViewerStateProvider + /api/me.
 */

export const revalidate = 60

type PageParams = { locale: 'en' | 'ar'; postId: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { postId, locale } = await params
  const post = await getPostById(postId, null)
  if (!post) return { title: 'Post not found · SuperAccountant', robots: { index: false, follow: false } }

  const description = post.body.trim().slice(0, 160)
  return {
    title: `${post.author.name} on SuperAccountant — ${post.kind}`,
    description,
    alternates: { canonical: `/${locale}/p/${post.id}` },
    openGraph: {
      type: 'article',
      title: `${post.author.name} on SuperAccountant`,
      description,
      ...(post.mediaUrl
        ? { images: [{ url: post.mediaUrl, alt: description }] }
        : {}),
      publishedTime: post.publishedAt,
    },
    twitter: {
      card: post.mediaUrl ? 'summary_large_image' : 'summary',
      title: `${post.author.name} — ${post.kind}`,
      description,
      ...(post.mediaUrl ? { images: [post.mediaUrl] } : {}),
    },
  }
}

export default async function PostDetail({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { locale, postId } = await params

  // Anonymous read — the client-side ViewerStateProvider fills in
  // viewer state after mount. This is what keeps `Cache-Control:
  // public` on the response and lets Googlebot actually index the
  // page (see /api/me for the incident this fixes).
  const post = await getPostById(postId, null)
  if (!post) notFound()
  const comments = await listComments(post.id, 100)

  return (
    <div className="relative min-h-screen bg-cream text-ink">
      <CommunityNav locale={locale} />

      <main className="relative mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <ViewerStateProvider postIds={[post.id]}>
          <FeedCard post={post} locale={locale} signedIn={false} />
          <section className="mt-8">
            <h2 className="mb-4 font-display text-lg font-extrabold tracking-tight text-ink">
              💬 Comments · {comments.length}
            </h2>
            <CommentThread
              postId={post.id}
              comments={comments}
              locale={locale}
              signedIn={false}
            />
          </section>
        </ViewerStateProvider>
      </main>
    </div>
  )
}
