import type { Metadata } from 'next'
import Link from 'next/link'
import { Fragment, Suspense } from 'react'
import { Film } from 'lucide-react'
import { CommunityNav } from '@/components/community/community-nav'
import { auth } from '@/lib/auth'
import { listActiveAuthors, listGlobalFeed } from '@/lib/community/feed-store'
import { FeedCard } from '@/components/community/feed-card'
import { StoryRow } from '@/components/community/story-row'
import { AnonCtaCard } from '@/components/community/anon-cta-card'
import { FeedSkeleton, StoryRowSkeleton } from '@/components/community/skeletons'
import { Sticker } from '@/components/community/su/primitives'
import type { PostKind } from '@/lib/community/types'

/**
 * Community feed — global chronological, optionally filtered by kind.
 * Public read (no auth required) so prospects can browse the community
 * without needing an account. That's the marketing flywheel: a stranger
 * lands here from Google, sees real students posting real wins, converts.
 *
 * Uses <Suspense> streaming to paint the shell + skeletons before the
 * DB round-trips complete. On a warm-cache request that's a ~30ms
 * first paint vs. waiting for the full render.
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

  // We resolve session once here so the header can render the "+ New
  // Post" button without waiting on feed data. Session is fast
  // (<10ms) and blocking on it doesn't hurt streaming.
  const session = await auth()
  const viewerId = session?.user?.id ?? null

  return (
    <div className="relative min-h-screen bg-cream text-ink">
      <CommunityNav
        locale={locale}
        userName={session?.user?.name ?? null}
        userEmail={session?.user?.email ?? ''}
      />

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
            {viewerId && (
              <Link
                href={`/${locale}/community/compose`}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-brand px-5 py-2 text-sm font-bold text-white shadow-pop-sm transition-all hover:-translate-y-0.5 hover:shadow-pop-md active:translate-y-[2px] active:shadow-pop-xs"
              >
                + New Post
              </Link>
            )}
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
            viewerId={viewerId}
          />
        </Suspense>
      </main>
    </div>
  )
}

/**
 * Async data section — only awaits the story-row query. Streams
 * independently of the main feed so a slow author query never blocks
 * the posts.
 */
async function ActiveAuthorsRail({ locale }: { locale: 'en' | 'ar' }) {
  const authors = await listActiveAuthors(7, 12)
  if (authors.length === 0) return null
  return <StoryRow authors={authors} locale={locale} />
}

/**
 * Async data section — only awaits the feed query. Renders directly
 * into the streamed response as soon as Postgres returns.
 */
async function FeedSection({
  kind,
  locale,
  viewerId,
}: {
  kind: PostKind | null
  locale: 'en' | 'ar'
  viewerId: string | null
}) {
  const posts = await listGlobalFeed({ viewerId, kind, limit: 30 })
  if (posts.length === 0) {
    return <EmptyState locale={locale} signedIn={!!viewerId} />
  }
  return (
    <div className="space-y-6">
      {posts.map((p, i) => (
        <Fragment key={p.id}>
          <FeedCard post={p} locale={locale} signedIn={!!viewerId} />
          {!viewerId && i === 2 && <AnonCtaCard locale={locale} />}
        </Fragment>
      ))}
    </div>
  )
}

function EmptyState({ locale, signedIn }: { locale: 'en' | 'ar'; signedIn: boolean }) {
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
        {signedIn
          ? 'Be the first to share a win, an ask, or a workpaper.'
          : 'The community is warming up. Check back soon.'}
      </p>
      {signedIn && (
        <Link
          href={`/${locale}/community/compose`}
          className="mt-6 inline-flex rounded-full border-2 border-ink bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-pop-sm transition-all hover:-translate-y-0.5 hover:shadow-pop-md active:translate-y-[2px] active:shadow-pop-xs"
        >
          Compose the first post
        </Link>
      )}
    </div>
  )
}
