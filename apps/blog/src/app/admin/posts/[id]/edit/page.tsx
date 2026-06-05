import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPostByIdForAdmin } from '@/lib/blog/store'
import { PostForm } from '@/components/post-form'
import { archiveAction, publishAction, updateDraftAction } from '../../actions'

type Params = { id: string }

export default async function EditPostPage({ params }: { params: Promise<Params> }) {
  const { id } = await params
  const post = await getPostByIdForAdmin(id)
  if (!post) notFound()

  // Bind the id into the actions so the form just submits FormData. The
  // server action signature accepts (id, formData) — we close over id
  // here so React's `formAction` prop can stay a plain async (FormData)
  // => Promise<void>.
  const save = async (fd: FormData) => {
    'use server'
    await updateDraftAction(id, fd)
  }
  const publish = async (fd: FormData) => {
    'use server'
    await publishAction(id, fd)
  }
  const archive = async (_fd: FormData) => {
    'use server'
    await archiveAction(id)
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/posts" className="text-xs text-fg-muted hover:text-fg">
            ← All posts
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Edit post
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Status: <span className="font-medium text-fg">{post.status}</span>
          </p>
        </div>
        <Link
          href={`/admin/posts/${id}`}
          className="rounded-lg border border-border px-3 py-1.5 text-xs hover:border-border-strong"
        >
          Preview
        </Link>
      </header>

      <PostForm
        defaults={{
          slug: post.slug,
          titleEn: post.titleEn,
          subtitleEn: post.subtitleEn,
          metaDescriptionEn: post.metaDescriptionEn,
          contentEnMdx: post.contentEnMdx,
          heroImageUrl: post.heroImageUrl,
          market: post.market,
          targetKeywords: post.targetKeywords,
        }}
        saveAction={save}
        publishAction={publish}
        archiveAction={archive}
        saveLabel={post.status === 'published' ? 'Save changes' : 'Save draft'}
        showPublish={post.status !== 'published'}
      />
    </div>
  )
}
