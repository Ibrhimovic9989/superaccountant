import type { BlogPost } from '@/lib/blog/types'

/**
 * Article schema for individual blog posts. Ships as static HTML on
 * first paint so crawlers get it in the initial fetch. Fields tuned to
 * clear Google's Rich Results Test with zero warnings:
 *
 *   - headline / description / datePublished / dateModified (required)
 *   - image  (required — falls back to the SuperAccountant logo when
 *              a post has no hero image, so the schema is never
 *              incomplete)
 *   - author (name-required — using "SuperAccountant Editorial Team"
 *              since we don't attribute posts to individuals yet)
 *   - publisher → cross-references the Organization @id emitted on
 *              the blog root, so Google merges them into one entity
 *   - articleSection / keywords — from targetKeywords
 *   - wordCount — computed from contentEnMdx (rough MDX-stripped count)
 *
 * BreadcrumbList emitted as a sibling script so it stays visible even
 * if Google decides to reject one of the two blobs.
 */

const SITE_URL = (
  process.env.NEXT_PUBLIC_BLOG_URL ?? 'https://blog.superaccountant.in'
).replace(/\/$/, '')
const MARKETING_URL = 'https://www.superaccountant.in'

const ORG_ID = `${MARKETING_URL}/#org`
const WEBSITE_ID = `${SITE_URL}/#website`

/** Dynamic OG image route — Next.js exposes it at /[slug]/opengraph-image. */
function ogImageUrl(slug: string): string {
  return `${SITE_URL}/${slug}/opengraph-image`
}

export function ArticleJsonLd({ post }: { post: BlogPost }) {
  const url = `${SITE_URL}/${post.slug}`
  const published = post.publishedAt?.toISOString() ?? post.createdAt.toISOString()
  const modified = post.updatedAt.toISOString()
  const wordCount = roughWordCount(post.contentEnMdx)
  const primaryKeyword = post.targetKeywords[0]

  const article: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.titleEn,
    description: post.metaDescriptionEn,
    inLanguage: 'en',
    datePublished: published,
    dateModified: modified,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    image: {
      '@type': 'ImageObject',
      url: post.heroImageUrl ?? ogImageUrl(post.slug),
      width: 1200,
      height: 630,
      caption: post.titleEn,
    },
    author: {
      '@type': 'Organization',
      name: 'SuperAccountant Editorial Team',
      url: SITE_URL,
    },
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': WEBSITE_ID },
    keywords: post.targetKeywords.join(', '),
    wordCount,
  }
  if (primaryKeyword) article.articleSection = primaryKeyword

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Journal', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: post.titleEn, item: url },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered, static JSON-LD
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered, static JSON-LD
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
    </>
  )
}

/**
 * Cheap MDX-stripped word count. Not perfect — a fenced code block full
 * of text is still counted — but good enough that Google's estimate is
 * within ~10% of the visible-body word count.
 */
function roughWordCount(mdx: string): number {
  if (!mdx) return 0
  const stripped = mdx
    // Fenced code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Inline code
    .replace(/`[^`]*`/g, ' ')
    // MDX/HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Markdown links / images
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Headings, bullets, blockquote markers
    .replace(/^\s*[#>*\-+]+\s*/gm, '')
  const words = stripped.trim().split(/\s+/).filter(Boolean)
  return words.length
}
