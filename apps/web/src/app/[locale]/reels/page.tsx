import type { Metadata } from 'next'
import Link from 'next/link'
import { Film, X } from 'lucide-react'
import { auth } from '@/lib/auth'
import { listReelsFeed } from '@/lib/community/feed-store'
import { ReelPlayer } from '@/components/community/reel-player'

/**
 * TikTok-style vertical reels feed. Full viewport, snap-scroll.
 *
 * This is a deliberately chrome-less page — no AppNav, no page
 * backdrop. Just the reels + a close-X in the top-right. AppNav
 * fights snap-scroll on mobile (viewport-anchored header eats the
 * first video's top), and the reels are visually complete on their
 * own.
 *
 * Public read. Prospects who land here from Instagram or a shared
 * link see clips without a sign-in wall. Sign-in only kicks in when
 * they try to like/comment.
 */

export const metadata: Metadata = {
  title: 'Reels — SuperAccountant Community',
  description:
    'Short videos from verified SuperAccountant students — GST walkthroughs, workpaper explainers, ZATCA quick-tips, career reels. India + KSA.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'SuperAccountant Reels',
    description: 'Short videos from verified accounting students. India + KSA.',
    type: 'website',
  },
}

export const revalidate = 60

type PageParams = { locale: 'en' | 'ar' }

export default async function ReelsPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { locale } = await params
  const session = await auth()
  const viewerId = session?.user?.id ?? null
  const posts = await listReelsFeed({ viewerId, limit: 20 })

  if (posts.length === 0) {
    return <EmptyState locale={locale} />
  }

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-black">
      {/* Close chrome — top-right */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-between p-4 sm:p-5">
        <Link
          href={`/${locale}/community`}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white backdrop-blur-md hover:bg-black/70"
        >
          <Film className="h-3.5 w-3.5" />
          Reels
        </Link>
        <Link
          href={`/${locale}/community`}
          className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Link>
      </div>

      {/* Vertical snap container */}
      <div className="h-[100dvh] w-full snap-y snap-mandatory overflow-y-scroll">
        {posts.map((post) => (
          <ReelPlayer
            key={post.id}
            post={post}
            locale={locale}
            signedIn={!!viewerId}
          />
        ))}
      </div>
    </div>
  )
}

function EmptyState({ locale }: { locale: 'en' | 'ar' }) {
  return (
    <div className="grid min-h-[100dvh] w-full place-items-center bg-black text-white">
      <div className="max-w-sm px-6 text-center">
        <Film className="mx-auto h-6 w-6 opacity-70" />
        <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-white/60">
          No reels yet
        </p>
        <h1 className="mt-2 text-lg font-semibold">The first reel lands here.</h1>
        <p className="mt-2 text-sm text-white/70">
          Post a short video from{' '}
          <Link href={`/${locale}/community/compose`} className="underline hover:opacity-90">
            /community/compose
          </Link>{' '}
          — up to 50 MB, ~90 seconds — and it&apos;ll show up here.
        </p>
        <Link
          href={`/${locale}/community`}
          className="mt-6 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:opacity-90"
        >
          Back to feed
        </Link>
      </div>
    </div>
  )
}
