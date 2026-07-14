import type { Metadata } from 'next'
import Link from 'next/link'
import { Fragment, Suspense } from 'react'
import { Film } from 'lucide-react'
import { CommunityNav } from '@/components/community/community-nav'
import { listActiveAuthors, listGlobalFeed } from '@/lib/community/feed-store'
import { FeedCard } from '@/components/community/feed-card'
import { StoryRow } from '@/components/community/story-row'
import { AnonCtaCard } from '@/components/community/anon-cta-card'
import { FeedSkeleton, StoryRowSkeleton } from '@/components/community/skeletons'
import { Sticker } from '@/components/community/su/primitives'
import { ViewerStateProvider } from '@/components/community/viewer-state'
import type { PostKind } from '@/lib/community/types'

/**
 * Community feed — global chronological, optionally filtered by kind.
 * Public read, deliberately anonymous SSG.
 *
 * The old build called `await auth()` at the top of this file, which
 * forced Next into fully-dynamic mode and shipped `Cache-Control:
 * no-store` on every response — so Googlebot refused to index it. As
 * of 2026-07-14 GSC reported zero of the app subdomain's public
 * pages were discovered.
 *
 * Now: we render the "logged-out" version of every card. The client
 * <ViewerStateProvider/> hits /api/community/viewer-state after mount
 * and fills in per-viewer state (liked / saved) without blocking the
 * static render. CommunityNav's <UserChrome/> does the same for the
 * user menu + notification bell.
 *
 * Perceived-speed impact: unchanged. The Suspense boundaries around
 * StoryRow and FeedSection still stream data in as it lands.
 */
export const revalidate = 60

const KIND_TABS: Array<{
  key: PostKind | 'all'
  label: string
  emoji: string
  tone: 'ink' | 'brand' | 'coral' | 'mint' | 'grape' | 'sky'
}> = [
  { key: 'all', label: 'All', emoji: '✨', tone: 'ink' },
  { key: 'milestone', label: 'Milestones', emoji: '⭐', tone: 'sky' },
  { key: 'win', label: 'Wins', emoji: '🏆', tone: 'mint' },
  { key: 'ask', label: 'Asks', emoji: '💬', tone: 'coral' },
  { key: 'tip', label: 'Tips', emoji: '💡', tone: 'brand' },
  { key: 'showcase', label: 'Showcases', emoji: '🎨', tone: 'grape' },
]

export const metadata: Metadata = {
  title: 'Community — SuperAccountant',
  description:
    'Verified accounting students and graduates sharing wins, tips, questions, and workpapers. India + KSA · SuperAccountant Community.',
  openGraph: {
    title: 'SuperAccountant Community',
    description:
      'Verified accounting students and graduates sharing wins, tips, questions, and workpapers.',
    type: 'website',
  },
}

type PageParams = { locale: 'en' | 'ar' }
type SearchParams = { kind?: string }

export default async function CommunityFeed({
  params,
  searchParams,
}: {
  params: Promise<PageParams>
  searchParams: Promise<SearchParams>
}) {
  const { locale } = await params
  const { kind: kindParam } = await searchParams
  const kind = KIND_TABS.find((t) => t.key === kindParam)?.key ?? 'all'

  return (
    <div className="relative min-h-screen bg-cream text-ink">
      <CommunityNav locale={locale} />

      <main className="relative mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mb-2 inline-block font-mono text-xs font-bold uppercase tracking-[0.18em] text-coral">
              ✨ The community
            </span>
            <h1 className="font-display text-3xl font-extrabold leading-none tracking-tight text-ink sm:text-5xl">
              What&apos;s happening.
            </h1>
            <p className="mt-2 text-sm font-medium text-ink/60">
              Verified students &amp; grads. India + KSA. Learn out loud.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${locale}/reels`}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-white px-4 py-2 text-sm font-bold text-ink shadow-pop-sm transition-all hover:-translate-y-0.5 hover:shadow-pop-md active:translate-y-[2px] active:shadow-pop-xs"
            >
              <Film className="h-4 w-4" />
              Reels
            </Link>
            {/* Always rendered — the compose page redirects to sign-in
                for anon viewers, so the button works for everyone and
                the SSG shell doesn't need to know auth state. */}
            <Link
              href={`/${locale}/community/compose`}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-brand px-5 py-2 text-sm font-bold text-white shadow-pop-sm transition-all hover:-translate-y-0.5 hover:shadow-pop-md active:translate-y-[2px] active:shadow-pop-xs"
            >
              + New Post
            </Link>
          </div>
        </header>

        {/* Kind tabs — sticker chips (server-rendered, no data dep) */}
        <div className="mb-6 -mx-2 flex items-center gap-2 overflow-x-auto px-2 pb-2">
          {KIND_TABS.map((t) => {
            const active = t.key === kind
            const href = t.key === 'all' ? `/${locale}/community` : `/${locale}/community?kind=${t.key}`
            return (
              <Link
                key={t.key}
                href={href}
                className={`shrink-0 rounded-full border-2 border-ink px-3.5 py-1.5 font-mono text-[11px] font-extrabold uppercase tracking-wider transition-all ${
                  active
                    ? 'bg-ink text-cream shadow-pop-xs'
                    : 'bg-white text-ink hover:-translate-y-0.5 hover:shadow-pop-xs'
                }`}
              >
                {t.emoji} {t.label}
              </Link>
            )
          })}
        </div>

        {/* Story rail — streams independently. `key` on Suspense so
            switching kind resets the boundary. */}
        {kind === 'all' && (
          <Suspense fallback={<StoryRowSkeleton />} key={`story-${kind}`}>
            <ActiveAuthorsRail locale={locale} />
          </Suspense>
        )}

        {/* Feed — streams independently. `key` on the boundary so a
            filter change resets both fallback + content. */}
        <Suspense fallback={<FeedSkeleton count={3} />} key={`feed-${kind}`}>
          <FeedSection
            kind={kind === 'all' ? null : (kind as PostKind)}
            locale={locale}
          />
        </Suspense>
      </main>
    </div>
  )
}

async function ActiveAuthorsRail({ locale }: { locale: 'en' | 'ar' }) {
  const authors = await listActiveAuthors(7, 12)
  if (authors.length === 0) return null
  return <StoryRow authors={authors} locale={locale} />
}

/**
 * Fetches the feed as anonymous (viewerId=null), wraps it in a
 * client ViewerStateProvider so LikeButton hydrates the true liked
 * state per-viewer after paint.
 */
async function FeedSection({
  kind,
  locale,
}: {
  kind: PostKind | null
  locale: 'en' | 'ar'
}) {
  const posts = await listGlobalFeed({ viewerId: null, kind, limit: 30 })
  if (posts.length === 0) {
    return <EmptyState locale={locale} />
  }
  return (
    <ViewerStateProvider postIds={posts.map((p) => p.id)}>
      <div className="space-y-6">
        {posts.map((p, i) => (
          <Fragment key={p.id}>
            <FeedCard post={p} locale={locale} signedIn={false} />
            {/* AnonCtaCard renders null for signed-in viewers after
                hydration, so we can always slot it in. */}
            {i === 2 && <AnonCtaCard locale={locale} />}
          </Fragment>
        ))}
      </div>
    </ViewerStateProvider>
  )
}

function EmptyState({ locale }: { locale: 'en' | 'ar' }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-ink bg-white p-10 text-center shadow-pop-sm">
      <div className="mx-auto mb-3 flex justify-center">
        <Sticker tone="coral" rotate="-4deg">
          🌱 Fresh page
        </Sticker>
      </div>
      <h2 className="font-display text-2xl font-extrabold text-ink">
        Nothing yet — this is your moment.
      </h2>
      <p className="mt-2 text-sm font-medium text-ink/60">
        Be the first to share a win, an ask, or a workpaper.
      </p>
      <Link
        href={`/${locale}/community/compose`}
        className="mt-6 inline-flex rounded-full border-2 border-ink bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-pop-sm transition-all hover:-translate-y-0.5 hover:shadow-pop-md active:translate-y-[2px] active:shadow-pop-xs"
      >
        Compose the first post
      </Link>
    </div>
  )
}
