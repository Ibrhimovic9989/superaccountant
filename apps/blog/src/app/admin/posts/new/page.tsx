import Link from 'next/link'
import { getTopicById } from '@/lib/blog/store'
import { PostForm } from '@/components/post-form'
import { createAndPublishAction, createDraftAction } from '../actions'

type SearchParams = { topic?: string }

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const topic = sp.topic ? await getTopicById(sp.topic) : null

  const defaults = topic
    ? {
        titleEn: topic.topic,
        targetKeywords: topic.sourceKeywords,
        market: topic.targetMarket,
      }
    : undefined

  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin/posts" className="text-xs text-fg-muted hover:text-fg">
          ← All posts
        </Link>
        <h1 className="mt-2 font-headline text-3xl font-semibold tracking-tight">New post</h1>
        {topic && (
          <p className="mt-1 text-sm text-fg-muted">
            Prefilled from topic: <strong className="text-fg">{topic.topic}</strong>
          </p>
        )}
      </header>

      <PostForm
        defaults={defaults}
        saveAction={createDraftAction}
        publishAction={createAndPublishAction}
        saveLabel="Save as draft"
      />
    </div>
  )
}
