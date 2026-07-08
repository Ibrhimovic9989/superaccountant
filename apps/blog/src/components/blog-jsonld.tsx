import type { BlogPost } from '@/lib/blog/types'

/**
 * Root-level structured data for the blog. Emits four schema.org
 * objects that Google's URL Inspection tool flagged as missing:
 *
 *   1. Organization  — publisher identity (name, url, logo), reused
 *      by every downstream Article as its `publisher`. Sameness
 *      matters for entity linking.
 *   2. WebSite       — enables the site-search box in SERPs later.
 *   3. Blog          — the collection type, so Google knows this
 *      subdomain is a periodical, not a set of orphan pages.
 *   4. ItemList      — the list of posts on the homepage, in order.
 *      Gives Google a structured "table of contents" so it can
 *      discover posts even if the sitemap fetch is still pending.
 *
 * All four are emitted as one @graph blob to keep the DOM light and
 * so Google's parser reads them as one connected knowledge graph.
 */

const SITE_URL = (
  process.env.NEXT_PUBLIC_BLOG_URL ?? 'https://blog.superaccountant.in'
).replace(/\/$/, '')
const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.superaccountant.in'
).replace(/\/$/, '')
const MARKETING_URL = 'https://www.superaccountant.in'

const LOGO_URL = `${MARKETING_URL}/icon.png`

const ORG_ID = `${MARKETING_URL}/#org`
const WEBSITE_ID = `${SITE_URL}/#website`
const BLOG_ID = `${SITE_URL}/#blog`

export function BlogJsonLd({ posts }: { posts: BlogPost[] }) {
  const organization = {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'SuperAccountant',
    alternateName: 'SuperAccountant Journal',
    url: MARKETING_URL,
    logo: LOGO_URL,
    description:
      'Bilingual (EN/AR) AI tutor for accountants — India + KSA tracks covering GST, TDS, ZATCA, VAT, Zakat, IFRS.',
    sameAs: [APP_URL, SITE_URL],
  }

  const website = {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: 'SuperAccountant Journal',
    publisher: { '@id': ORG_ID },
    inLanguage: 'en',
  }

  const blog = {
    '@type': 'Blog',
    '@id': BLOG_ID,
    url: SITE_URL,
    name: 'SuperAccountant Journal',
    description:
      'Practitioner-grade guides for B.Com students, recent commerce graduates, and working accountants. India + KSA tracks.',
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': WEBSITE_ID },
    inLanguage: 'en',
  }

  const itemList = {
    '@type': 'ItemList',
    itemListElement: posts.slice(0, 20).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/${p.slug}`,
      name: p.titleEn,
    })),
  }

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [organization, website, blog, itemList],
  }

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered, static JSON-LD
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  )
}
