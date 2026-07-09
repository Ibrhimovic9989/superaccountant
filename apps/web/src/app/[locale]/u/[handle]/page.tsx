import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CommunityNav } from '@/components/community/community-nav'
import { auth } from '@/lib/auth'
import { getProfileByHandle } from '@/lib/community/profile-store'
import { PostTile } from '@/components/community/post-tile'
import { AchievementRail } from '@/components/community/achievement-rail'
import { ProfileHeader } from '@/components/community/profile-header'
import type { ProfileView } from '@/lib/community/types'

/**
 * Public profile page for a community member. Server-rendered so
 * Google can index it — this is the recruiter-facing testimonial
 * surface. Auth is optional: signed-in viewers see the follow button
 * + like counts, anonymous viewers get a clean read-only view.
 *
 * ISR — profiles change on post/like/follow, but we re-validate at
 * mutation time via revalidatePath. 5-min fallback so a page whose
 * revalidate never fires still refreshes at least once every 5 min.
 */
export const revalidate = 300

type PageParams = { locale: 'en' | 'ar'; handle: string }

async function loadProfile(handle: string) {
  const session = await auth()
  const result = await getProfileByHandle(handle, session?.user?.id ?? null)
  return { session, result }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { handle, locale } = await params
  const { result } = await loadProfile(handle)
  if (!result || 'blocked' in result) {
    return { title: 'Not found · SuperAccountant', robots: { index: false, follow: false } }
  }
  const { author, bio } = result.view
  const title = `${author.name} (@${author.handle}) — SuperAccountant`
  const description = bio
    ? bio.slice(0, 160)
    : author.headline
      ? `${author.headline} on SuperAccountant. See verified achievements and posts.`
      : `${author.name} on SuperAccountant. See verified achievements and posts.`
  const ogUrl = `/${locale}/u/${author.handle}/opengraph-image`
  return {
    title,
    description,
    alternates: { canonical: `/${locale}/u/${author.handle}` },
    openGraph: {
      type: 'profile',
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${author.name}'s profile` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl],
    },
  }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { handle, locale } = await params
  const { session, result } = await loadProfile(handle)

  if (!result) notFound()
  if ('blocked' in result) {
    if (result.blocked === 'not-found') notFound()
    return <PrivateProfile locale={locale} handle={handle} />
  }
  const view: ProfileView = result.view

  return (
    <div className="relative min-h-screen bg-cream text-ink">
      <CommunityNav
        locale={locale}
        userName={session?.user?.name ?? null}
        userEmail={session?.user?.email ?? ''}
      />

      <main className="relative mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <ProfileHeader view={view} locale={locale} viewerId={session?.user?.id ?? null} />
        {view.achievements.length > 0 && (
          <div className="mt-8">
            <AchievementRail achievements={view.achievements} />
          </div>
        )}
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
              Posts · {view.postCount}
            </h2>
            {view.viewerIsOwner && (
              <Link
                href={`/${locale}/community/compose`}
                className="rounded-full border-2 border-ink bg-brand px-3.5 py-1.5 font-mono text-[10px] font-extrabold uppercase tracking-wider text-white shadow-pop-xs transition-all hover:-translate-y-0.5 hover:shadow-pop-sm"
              >
                + New post
              </Link>
            )}
          </div>
          {view.posts.length === 0 ? (
            <EmptyPosts isOwner={view.viewerIsOwner} locale={locale} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {view.posts.map((p) => (
                <PostTile key={p.id} post={p} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function EmptyPosts({ isOwner, locale }: { isOwner: boolean; locale: 'en' | 'ar' }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-ink bg-white p-10 text-center shadow-pop-xs">
      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/60">
        No posts yet
      </p>
      <p className="mt-3 font-display text-lg font-extrabold text-ink">
        {isOwner
          ? 'Kick things off. Post your first win.'
          : "This person hasn't shared anything publicly yet."}
      </p>
      {isOwner && (
        <Link
          href={`/${locale}/community/compose`}
          className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-ink bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-pop-sm transition-all hover:-translate-y-0.5 hover:shadow-pop-md active:translate-y-[2px] active:shadow-pop-xs"
        >
          Compose first post
        </Link>
      )}
    </div>
  )
}

function PrivateProfile({ locale, handle }: { locale: 'en' | 'ar'; handle: string }) {
  return (
    <div className="relative min-h-screen bg-cream text-ink">
      <main className="mx-auto grid min-h-[60vh] max-w-lg place-items-center px-6 text-center">
        <div className="rounded-3xl border-2 border-ink bg-white p-8 shadow-pop-md">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/60">
            @{handle}
          </p>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-ink">
            This profile is member-only.
          </h1>
          <p className="mt-3 text-sm font-medium text-ink/60">
            Sign in with your SuperAccountant account to view it.
          </p>
          <Link
            href={`/${locale}/sign-in`}
            className="mt-6 inline-flex rounded-full border-2 border-ink bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-pop-sm transition-all hover:-translate-y-0.5 hover:shadow-pop-md active:translate-y-[2px] active:shadow-pop-xs"
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  )
}
