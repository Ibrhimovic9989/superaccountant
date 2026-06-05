import type { Metadata } from 'next'
import Link from 'next/link'
import { listByKeyword } from '@/lib/blog/store'
import { PostCard } from '@/components/post-card'

type Params = { keyword: string }

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { keyword } = await params
  const decoded = decodeURIComponent(keyword)
  const posts = await listByKeyword(decoded, 1)
  // Zero matches → noindex (avoids polluting SERPs with empty tag pages).
  const robots = posts.length === 0 ? { index: false, follow: false } : undefined
  return {
    title: `${decoded} — SuperAccountant Journal`,
    description: `Articles tagged ${decoded} from the SuperAccountant journal.`,
    ...(robots ? { robots } : {}),
  }
}

export default async function TagPage({ params }: { params: Promise<Params> }) {
  const { keyword } = await params
  const decoded = decodeURIComponent(keyword)
  const posts = await listByKeyword(decoded, 50)

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p className="font-mono text-[11px] uppercase tracking-wider text-accent">Tag</p>
      <h1 className="mt-3 font-headline text-4xl font-semibold tracking-tight">{decoded}</h1>
      <p className="mt-2 text-sm text-fg-muted">
        {posts.length} {posts.length === 1 ? 'article' : 'articles'} on this topic.
      </p>

      {posts.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-bg-soft p-10 text-center">
          <p className="text-sm text-fg-muted">
            Nothing here yet.{' '}
            <Link href="/" className="text-accent hover:underline">
              Back to the journal
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </main>
  )
}
