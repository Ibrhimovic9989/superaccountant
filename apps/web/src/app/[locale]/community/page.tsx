import type { Metadata } from 'next'
import Link from 'next/link'
import { Fragment } from 'react'
import { Compass, Film, Filter, Sparkles } from 'lucide-react'
import { AppNav } from '@/components/app-nav'
import { PageBackdrop } from '@/components/page-backdrop'
import { auth } from '@/lib/auth'
import { listActiveAuthors, listGlobalFeed } from '@/lib/community/feed-store'
import { FeedCard } from '@/components/community/feed-card'
import { StoryRow } from '@/components/community/story-row'
import { AnonCtaCard } from '@/components/community/anon-cta-card'
import type { PostKind } from '@/lib/community/types'

/**
 * Community feed — global chronological, optionally filtered by kind.
 * Public read (no auth required) so prospects can browse the community
 * without needing an account. That's the marketing flywheel: a stranger
 * lands here from Google, sees real students posting real wins, converts.
 */
export const revalidate = 60

const KIND_TABS: Array<{ key: PostKind | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'milestone', label: 'Milestones' },
  { key: 'win', label: 'Wins' },
  { key: 'ask', label: 'Asks' },
  { key: 'tip', label: 'Tips' },
  { key: 'showcase', label: 'Showcases' },
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
  const session = await auth()
  const viewerId = session?.user?.id ?? null

  const [posts, activeAuthors] = await Promise.all([
    listGlobalFeed({
      viewerId,
      kind: kind === 'all' ? null : (kind as PostKind),
      limit: 30,
    }),
    // Only show the "who's active" rail on the un-filtered feed —
    // it's a cross-cutting signal, not a kind view.
    kind === 'all' ? listActiveAuthors(7, 12) : Promise.resolve([]),
  ])

  return (
    <div className="relative min-h-screen bg-bg text-fg">
      <PageBackdrop />
      <AppNav
        locale={locale}
        userName={session?.user?.name ?? null}
        userEmail={session?.user?.email ?? ''}
      />

      <main className="relative mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
              <Sparkles className="mr-1 inline h-3 w-3" />
              Community
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              What's happening
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${locale}/reels`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-elev px-3 py-1.5 text-sm text-fg-muted hover:border-accent hover:text-fg"
            >
              <Film className="h-3.5 w-3.5" />
              Reels
            </Link>
            {viewerId && (
              <Link
                href={`/${locale}/community/compose`}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-fg hover:opacity-90"
              >
                + Post
              </Link>
            )}
          </div>
        </header>

        {/* Kind tabs — scrolls horizontally on mobile */}
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 font-mono text-[11px] uppercase tracking-wider">
          <Filter className="h-3 w-3 shrink-0 text-fg-subtle" />
          {KIND_TABS.map((t) => {
            const active = t.key === kind
            const href = t.key === 'all'
              ? `/${locale}/community`
              : `/${locale}/community?kind=${t.key}`
            return (
              <Link
                key={t.key}
                href={href}
                className={
                  active
                    ? 'shrink-0 rounded-full border border-accent bg-accent-soft px-3 py-1 text-accent'
                    : 'shrink-0 rounded-full border border-border bg-bg-elev px-3 py-1 text-fg-muted hover:border-border-strong hover:text-fg'
                }
              >
                {t.label}
              </Link>
            )
          })}
        </div>

        {/* Story rail — active authors this week */}
        {activeAuthors.length > 0 && (
          <StoryRow authors={activeAuthors} locale={locale} />
        )}

        {/* Feed */}
        {posts.length === 0 ? (
          <EmptyState locale={locale} signedIn={!!viewerId} />
        ) : (
          <div className="space-y-5">
            {posts.map((p, i) => (
              <Fragment key={p.id}>
                <FeedCard post={p} locale={locale} signedIn={!!viewerId} />
                {/* Anon-only CTA slotted between real posts. Position
                    3 keeps it above the fold on desktop, below the
                    first two social proofs on mobile. */}
                {!viewerId && i === 2 && <AnonCtaCard locale={locale} />}
              </Fragment>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function EmptyState({ locale, signedIn }: { locale: 'en' | 'ar'; signedIn: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-bg-elev p-10 text-center">
      <Compass className="mx-auto h-6 w-6 text-fg-subtle" />
      <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        Nothing yet
      </p>
      <p className="mt-2 text-sm text-fg-muted">
        {signedIn
          ? 'Be the first to share a win, an ask, or a workpaper.'
          : 'The community is warming up. Check back soon.'}
      </p>
      {signedIn && (
        <Link
          href={`/${locale}/community/compose`}
          className="mt-5 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          Compose the first post
        </Link>
      )}
    </div>
  )
}
