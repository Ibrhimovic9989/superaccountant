import type { Metadata } from 'next'
import Link from 'next/link'
import { Hash } from 'lucide-react'
import { AppNav } from '@/components/app-nav'
import { PageBackdrop } from '@/components/page-backdrop'
import { auth } from '@/lib/auth'
import { prisma } from '@sa/db'
import { FeedCard } from '@/components/community/feed-card'
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
  const session = await auth()
  const viewerId = session?.user?.id ?? null

  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT
       p."id", p."authorId", p."kind", p."body", p."tags", p."mediaUrl",
       p."source", p."linkedEntityType", p."linkedEntityId",
       p."publishedAt", p."likeCount", p."commentCount",
       iu."name" AS "authorName",
       iu."image" AS "authorImage",
       cp."handle" AS "authorHandle",
       cp."tone" AS "authorTone",
       cp."verified" AS "authorVerified",
       iu."preferredTrack"::text AS "authorTrack",
       COALESCE(
         (SELECT true FROM "CommunityPostReaction" r
           WHERE r."postId" = p."id" AND r."userId" = $2 AND r."kind" = 'like' LIMIT 1),
         false
       ) AS "viewerLiked",
       COALESCE(
         (SELECT true FROM "CommunityPostReaction" r
           WHERE r."postId" = p."id" AND r."userId" = $2 AND r."kind" = 'save' LIMIT 1),
         false
       ) AS "viewerSaved"
     FROM "CommunityPost" p
     JOIN "IdentityUser" iu ON iu."id" = p."authorId"
     LEFT JOIN "CommunityProfile" cp ON cp."userId" = p."authorId"
     WHERE p."deletedAt" IS NULL AND $1::text = ANY(p."tags")
     ORDER BY p."publishedAt" DESC
     LIMIT 40`,
    decoded,
    viewerId ?? '',
  )
  const posts: FeedPostView[] = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    body: r.body,
    tags: r.tags,
    mediaUrl: r.mediaUrl,
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
    <div className="relative min-h-screen bg-bg text-fg">
      <PageBackdrop />
      <AppNav
        locale={locale}
        userName={session?.user?.name ?? null}
        userEmail={session?.user?.email ?? ''}
      />

      <main className="relative mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6">
          <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
            <Hash className="h-3 w-3" />
            Tag
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            #{decoded}
          </h1>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            {posts.length === 40 ? '40+' : posts.length} posts
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-bg-elev p-10 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              No posts yet
            </p>
            <p className="mt-2 text-sm text-fg-muted">
              Nothing tagged with #{decoded}. Try{' '}
              <Link href={`/${locale}/community`} className="text-accent hover:underline">
                the main feed
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {posts.map((p) => (
              <FeedCard key={p.id} post={p} locale={locale} signedIn={!!viewerId} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
