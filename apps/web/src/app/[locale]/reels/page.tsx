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
      {/* Close chrome — top corners */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-between p-4 sm:p-5">
        <span
          style={{ rotate: '-2deg' }}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-cream px-3 py-1.5 font-mono text-[10px] font-extrabold uppercase tracking-wider text-ink shadow-pop-xs"
        >
          <Film className="h-3.5 w-3.5" />
          Reels
        </span>
        <Link
          href={`/${locale}/community`}
          className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-cream text-ink shadow-pop-xs transition-all hover:-translate-y-0.5 hover:shadow-pop-sm active:translate-y-[2px]"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
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
    <div className="grid min-h-[100dvh] w-full place-items-center bg-cream text-ink">
      <div className="max-w-sm rounded-3xl border-2 border-ink bg-white p-8 text-center shadow-pop">
        <span className="text-4xl">🎬</span>
        <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-wider text-ink/60">
          No reels yet
        </p>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink">
          The first reel lands here.
        </h1>
        <p className="mt-3 text-sm font-medium text-ink/60">
          Post a short video from the composer — up to 50 MB,
          ~90 seconds — and it&apos;ll show up here.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href={`/${locale}/community/compose`}
            className="inline-flex rounded-full border-2 border-ink bg-brand px-5 py-2 text-sm font-bold text-white shadow-pop-sm transition-all hover:-translate-y-0.5 hover:shadow-pop-md active:translate-y-[2px] active:shadow-pop-xs"
          >
            Post a reel
          </Link>
          <Link
            href={`/${locale}/community`}
            className="inline-flex rounded-full border-2 border-ink bg-white px-5 py-2 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-cream"
          >
            Back to feed
          </Link>
        </div>
      </div>
    </div>
  )
}
