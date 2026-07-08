import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  getPublishedPostBySlug,
  incrementViewCount,
  listRelatedByKeywords,
} from '@/lib/blog/store'
import { ArticleView } from '@/components/article-view'
import { ArticleJsonLd } from '@/components/article-jsonld'
import { FaqJsonLd } from '@/components/faq-jsonld'

type Params = { slug: string }

// Keep ISR aggressive — once published, content rarely changes; admin
// edits force-revalidate via the dashboard (Phase 2). 5 min is a safe
// default that won't drown Postgres in scrapers.
export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPublishedPostBySlug(slug, 'en')
  if (!post) return { title: 'Not found' }
  // OG image — prefer the explicitly-uploaded hero, else the dynamic
  // `/[slug]/opengraph-image` route (Next.js auto-generates the URL
  // from the file). Every post gets a real social card either way.
  const ogImage = post.heroImageUrl ?? `/${post.slug}/opengraph-image`
  return {
    title: `${post.titleEn} — SuperAccountant`,
    description: post.metaDescriptionEn,
    openGraph: {
      title: post.titleEn,
      description: post.metaDescriptionEn,
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.titleEn }],
      ...(post.publishedAt ? { publishedTime: post.publishedAt.toISOString() } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.titleEn,
      description: post.metaDescriptionEn,
      images: [ogImage],
    },
    alternates: { canonical: `/${post.slug}` },
  }
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const post = await getPublishedPostBySlug(slug, 'en')
  if (!post) notFound()

  // Best-effort view count. Wrapped because a failure here must never
  // 500 the public surface — analytics is best-effort, not load-bearing.
  try {
    await incrementViewCount(post.id)
  } catch {
    /* swallow */
  }

  const related = await listRelatedByKeywords(post.id, post.targetKeywords, 3)

  return (
    <>
      <ArticleJsonLd post={post} />
      <FaqJsonLd mdx={post.contentEnMdx} />
      <ArticleView post={post} related={related} />
    </>
  )
}
