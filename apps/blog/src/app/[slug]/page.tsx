import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { after } from 'next/server'
import {
  getPublishedPostBySlug,
  listAllPublishedSlugs,
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

// Slugs not in the prerender list still render (new posts don't wait
// for a rebuild) — they just get ISR on first hit instead of a
// build-time snapshot.
export const dynamicParams = true

/**
 * Pre-render every published slug at build time. This is the piece
 * that flips `Cache-Control` from `no-store` to `public, max-age=0,
 * s-maxage=300` — Googlebot needs a cacheable response, and without
 * `generateStaticParams` Next kept falling back to fully-dynamic
 * (see the incident: 0/57 blog URLs discovered by Google as of
 * 2026-07-14).
 */
export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await listAllPublishedSlugs()
  return slugs.map((s) => ({ slug: s.slug }))
}

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

  // View count is a mutation, and running it inside the render path
  // was pushing Next's inference to treat this route as fully-dynamic
  // (Cache-Control: no-store) instead of ISR. `after()` fires *after*
  // the response has been streamed, so the render itself stays pure
  // and cacheable — which is what Googlebot needs to actually index
  // these pages.
  after(async () => {
    try {
      await incrementViewCount(post.id)
    } catch {
      /* best-effort — analytics is never load-bearing */
    }
  })

  const related = await listRelatedByKeywords(post.id, post.targetKeywords, 3)

  return (
    <>
      <ArticleJsonLd post={post} />
      <FaqJsonLd mdx={post.contentEnMdx} />
      <ArticleView post={post} related={related} />
    </>
  )
}
