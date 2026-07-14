import type { Metadata } from 'next'
import Link from 'next/link'
import { Hash } from 'lucide-react'
import { CommunityNav } from '@/components/community/community-nav'
import { prisma } from '@sa/db'
import { FeedCard } from '@/components/community/feed-card'
import { ViewerStateProvider } from '@/components/community/viewer-state'
import type { FeedPostView, PostKind, ProfileTone } from '@/lib/community/types'

/**
 * /tag/[tag] — feed filtered by a single tag. Public read for SEO;
 * every tag URL becomes a landing page a Google visitor might hit.
 *
 * The tag column on CommunityPost is text[] with a GIN index (not
 * yet added — falls back to a seq scan). If tag pages get real
 * traffic, add:
 *   CREATE INDEX CommunityPost_tags_gin_idx ON "CommunityPost"
 *     USING GIN ("tags") WHERE "deletedAt" IS NULL;
 */

export const revalidate = 60

type PageParams = { locale: 'en' | 'ar'; tag: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { tag } = await params
  const decoded = decodeURIComponent(tag)
  return {
    title: `#${decoded} · SuperAccountant Community`,
    description: `Posts tagged #${decoded} from the SuperAccountant community.`,
  }
}

type Row = {
  id: string
  authorId: string
  kind: PostKind
  body: string
  tags: string[]
  mediaUrl: string | null
  mediaBlurhash: string | null
  source: string
  linkedEntityType: string | null
  linkedEntityId: string | null
  publishedAt: Date
  likeCount: number
  commentCount: number
  authorName: string | null
  authorImage: string | null
  authorHandle: string
  authorTone: ProfileTone
  authorVerified: boolean
  authorTrack: 'india' | 'ksa' | null
  viewerLiked: boolean
  viewerSaved: boolean
}

export default async function TagPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { locale, tag } = await params
  const decoded = decodeURIComponent(tag).toLowerCase()

  // Anonymous SSG — viewerLiked/viewerSaved always false. The client
  // <ViewerStateProvider/> below hydrates the real state after mount
  // so signed-in users see filled hearts within ~200ms of paint.
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT
       p."id", p."authorId", p."kind", p."body", p."tags", p."mediaUrl",
       p."mediaBlurhash", p."source", p."linkedEntityType", p."linkedEntityId",
       p."publishedAt", p."likeCount", p."commentCount",
       iu."name" AS "authorName",
       iu."image" AS "authorImage",
       cp."handle" AS "authorHandle",
       cp."tone" AS "authorTone",
       cp."verified" AS "authorVerified",
       iu."preferredTrack"::text AS "authorTrack",
       false AS "viewerLiked",
       false AS "viewerSaved"
     FROM "CommunityPost" p
     JOIN "IdentityUser" iu ON iu."id" = p."authorId"
     LEFT JOIN "CommunityProfile" cp ON cp."userId" = p."authorId"
     WHERE p."deletedAt" IS NULL AND $1::text = ANY(p."tags")
     ORDER BY p."publishedAt" DESC
     LIMIT 40`,
    decoded,
  )
  const posts: FeedPostView[] = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    body: r.body,
    tags: r.tags,
    mediaUrl: r.mediaUrl,
    mediaBlurhash: r.mediaBlurhash,
    source: r.source as FeedPostView['source'],
    linkedEntityType: r.linkedEntityType,
    linkedEntityId: r.linkedEntityId,
    publishedAt: r.publishedAt.toISOString(),
    author: {
      id: r.authorId,
      handle: r.authorHandle ?? '',
      name: r.authorName ?? r.authorHandle ?? '',
      avatarUrl: r.authorImage,
      tone: r.authorTone ?? 'accent',
      verified: r.authorVerified,
      headline: r.authorTrack === 'india'
        ? 'India · Chartered Path'
        : r.authorTrack === 'ksa'
          ? "KSA · Mu'tamad Path"
          : null,
    },
    likeCount: r.likeCount,
    commentCount: r.commentCount,
    viewerLiked: r.viewerLiked,
    viewerSaved: r.viewerSaved,
  }))

  return (
    <div className="relative min-h-screen bg-cream text-ink">
      <CommunityNav locale={locale} />

      <main className="relative mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-8">
          <span className="mb-2 inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-coral">
            <Hash className="h-3 w-3" />
            Tag
          </span>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            #{decoded}
          </h1>
          <p className="mt-2 inline-flex rounded-full border-2 border-ink bg-white px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-ink shadow-pop-xs">
            {posts.length === 40 ? '40+' : posts.length} posts
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-ink bg-white p-10 text-center shadow-pop-xs">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/60">
              No posts yet
            </p>
            <p className="mt-3 font-display text-lg font-extrabold text-ink">
              Nothing tagged with #{decoded}.
            </p>
            <p className="mt-2 text-sm font-medium text-ink/60">
              Try{' '}
              <Link
                href={`/${locale}/community`}
                className="font-bold text-brand underline decoration-2 underline-offset-4"
              >
                the main feed
              </Link>
              .
            </p>
          </div>
        ) : (
          <ViewerStateProvider postIds={posts.map((p) => p.id)}>
            <div className="space-y-6">
              {posts.map((p) => (
                <FeedCard key={p.id} post={p} locale={locale} signedIn={false} />
              ))}
            </div>
          </ViewerStateProvider>
        )}
      </main>
    </div>
  )
}
