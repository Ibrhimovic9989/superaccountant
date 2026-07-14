import { ArrowRight, BookOpen } from 'lucide-react'
import Link from 'next/link'

/**
 * "From the Journal" — server-fetched list of the 6 most recent blog
 * posts, rendered on the marketing homepage as permanent internal
 * links to the blog subdomain.
 *
 * Purpose is SEO, not editorial: Google's crawler follows every link
 * on the highest-authority page on the domain (marketing homepage
 * on www.superaccountant.in) — putting real, indexable links from
 * this page to individual blog URLs is the fastest way to get
 * Googlebot to actually fetch and index the blog subdomain, which
 * as of 2026-07-14 had zero of its 57 URLs discovered.
 *
 * Fetches from blog.superaccountant.in/api/featured (ISR, cached at
 * the edge for 10 min so this section stays fresh without adding a
 * DB round-trip to every marketing homepage render).
 */

const BLOG_URL = process.env.NEXT_PUBLIC_BLOG_URL ?? 'https://blog.superaccountant.in'

type FeaturedPost = {
  slug: string
  title: string
  description: string
  heroImageUrl: string | null
  market: 'india' | 'ksa' | 'global'
  publishedAt: string
}

async function fetchFeatured(): Promise<FeaturedPost[]> {
  try {
    const res = await fetch(`${BLOG_URL}/api/featured`, {
      next: { revalidate: 600 },
    })
    if (!res.ok) return []
    const data = (await res.json()) as { posts?: FeaturedPost[] }
    return data.posts ?? []
  } catch {
    // A blog-side outage must never take down the marketing homepage —
    // the section just disappears until the feed is back.
    return []
  }
}

const MARKET_LABEL = {
  india: 'India',
  ksa: 'KSA',
  global: 'Global',
} as const

const COPY = {
  en: {
    eyebrow: 'From the Journal',
    title: 'Guides worth reading before you learn',
    subtitle:
      'Practitioner-grade explainers on GST, ZATCA, IFRS, AI in accounting, and career moves. Written for B.Com students, freshers, and working accountants.',
    seeAll: 'Read all articles',
    empty: 'New articles land soon.',
  },
  ar: {
    eyebrow: 'من المجلة',
    title: 'أدلة تستحق القراءة قبل أن تتعلم',
    subtitle:
      'شروحات عملية عن GST و ZATCA و IFRS والذكاء الاصطناعي في المحاسبة والمسار المهني — لطلاب B.Com والخريجين الجدد والمحاسبين العاملين.',
    seeAll: 'اقرأ كل المقالات',
    empty: 'مقالات جديدة قادمة قريبًا.',
  },
} as const

export async function FeaturedPosts({ locale }: { locale: 'en' | 'ar' }) {
  const posts = await fetchFeatured()
  const t = COPY[locale]

  return (
    <section className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            <BookOpen className="h-3 w-3 text-accent" />
            {t.eyebrow}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">
            {t.subtitle}
          </p>
        </div>
        <Link
          href={BLOG_URL}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-elev px-4 py-2 text-sm text-fg-muted transition-colors hover:border-accent hover:text-fg"
        >
          {t.seeAll}
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-elev/40 p-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {t.empty}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`${BLOG_URL}/${p.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-bg-elev/50 transition-colors hover:border-accent"
            >
              {p.heroImageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={p.heroImageUrl}
                  alt=""
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover"
                />
              )}
              <div className="flex flex-1 flex-col p-5">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-bg px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                  {MARKET_LABEL[p.market]}
                </span>
                <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug group-hover:text-accent">
                  {p.title}
                </h3>
                <p className="mt-2 line-clamp-2 flex-1 text-sm text-fg-muted">
                  {p.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-accent">
                  Read
                  <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
