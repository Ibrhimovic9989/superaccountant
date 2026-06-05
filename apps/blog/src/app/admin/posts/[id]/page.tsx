import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, Pencil } from 'lucide-react'
import { getPostByIdForAdmin, listRelatedByKeywords } from '@/lib/blog/store'
import { ArticleView } from '@/components/article-view'

type Params = { id: string }

/**
 * Admin preview — renders the post exactly as the public route would,
 * regardless of status. Lets editors eyeball drafts before publishing.
 */
export default async function AdminPostPreviewPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const post = await getPostByIdForAdmin(id)
  if (!post) notFound()
  const related = await listRelatedByKeywords(post.id, post.targetKeywords, 3)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
        <p className="text-warning">
          Admin preview · status <strong>{post.status}</strong>
          {post.status !== 'published' && ' · not visible to the public yet'}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/posts/${id}/edit`}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs hover:border-border-strong"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Link>
          {post.status === 'published' && (
            <Link
              href={`/${post.slug}`}
              className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs text-accent-fg hover:opacity-90"
            >
              <ExternalLink className="h-3 w-3" />
              View live
            </Link>
          )}
        </div>
      </div>

      <ArticleView post={post} related={related} />
    </div>
  )
}
