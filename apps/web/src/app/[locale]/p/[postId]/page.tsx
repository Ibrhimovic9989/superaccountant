import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AppNav } from '@/components/app-nav'
import { PageBackdrop } from '@/components/page-backdrop'
import { auth } from '@/lib/auth'
import { getPostById, listComments } from '@/lib/community/feed-store'
import { FeedCard } from '@/components/community/feed-card'
import { CommentThread } from '@/components/community/comment-thread'

/**
 * Public post detail. Reader lands here from the feed, a profile grid
 * tile, or a share link. Comments load with the page — no separate
 * request — so the perceived latency stays close to zero.
 *
 * Server-rendered, indexable. Ask posts especially are long-tail SEO
 * gold: a question + a good answer = a page that ranks.
 */

export const revalidate = 60

type PageParams = { locale: 'en' | 'ar'; postId: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { postId, locale } = await params
  const session = await auth()
  const post = await getPostById(postId, session?.user?.id ?? null)
  if (!post) return { title: 'Post not found · SuperAccountant', robots: { index: false, follow: false } }

  // First 160 chars of the body as the description.
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
  const session = await auth()
  const viewerId = session?.user?.id ?? null

  const post = await getPostById(postId, viewerId)
  if (!post) notFound()
  const comments = await listComments(post.id, 100)

  return (
    <div className="relative min-h-screen bg-bg text-fg">
      <PageBackdrop />
      <AppNav
        locale={locale}
        userName={session?.user?.name ?? null}
        userEmail={session?.user?.email ?? ''}
      />

      <main className="relative mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <FeedCard post={post} locale={locale} signedIn={!!viewerId} />
        <section className="mt-8">
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            Comments · {comments.length}
          </h2>
          <CommentThread
            postId={post.id}
            comments={comments}
            locale={locale}
            signedIn={!!viewerId}
          />
        </section>
      </main>
    </div>
  )
}
