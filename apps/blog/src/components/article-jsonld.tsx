import type { BlogPost } from '@/lib/blog/types'

/**
 * Server component that emits a schema.org Article + BreadcrumbList
 * blob. Same shape as apps/web/src/components/seo/job-posting-jsonld.tsx
 * — ships as static HTML on first paint so crawlers can index it.
 */

const SITE_URL = (
  process.env.NEXT_PUBLIC_BLOG_URL ?? 'https://blog.superaccountant.in'
).replace(/\/$/, '')

export function ArticleJsonLd({ post }: { post: BlogPost }) {
  const url = `${SITE_URL}/${post.slug}`
  const published = post.publishedAt?.toISOString() ?? post.createdAt.toISOString()
  const modified = post.updatedAt.toISOString()

  const article: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.titleEn,
    description: post.metaDescriptionEn,
    inLanguage: 'en',
    datePublished: published,
    dateModified: modified,
    mainEntityOfPage: url,
    url,
    author: {
      '@type': 'Organization',
      name: 'SuperAccountant Editorial Team',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'SuperAccountant',
      url: 'https://www.superaccountant.in',
    },
    keywords: post.targetKeywords.join(', '),
    ...(post.heroImageUrl ? { image: post.heroImageUrl } : {}),
  }

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
