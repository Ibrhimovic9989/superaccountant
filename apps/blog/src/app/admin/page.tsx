import Link from 'next/link'
import { Archive, CheckCircle2, Clock, FileText } from 'lucide-react'
import {
  countByStatusForAdmin,
  listAllPostsForAdmin,
  listRecentTopicsForAdmin,
} from '@/lib/blog/store'
import { marketLabel, relativeDate } from '@/lib/blog/format'

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  const [counts, recentPosts, recentTopics] = await Promise.all([
    countByStatusForAdmin(),
    listAllPostsForAdmin({ limit: 5 }),
    listRecentTopicsForAdmin(5),
  ])

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-fg-muted">
          What&apos;s live, what&apos;s in flight, what&apos;s waiting in the queue.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Published" value={counts.published} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Drafts" value={counts.draft} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Scheduled" value={counts.scheduled} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Archived" value={counts.archived} icon={<Archive className="h-4 w-4" />} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-fg-muted">
            Recent posts
          </h2>
          <Link href="/admin/posts" className="text-xs text-accent hover:underline">
            All posts →
          </Link>
        </div>
        {recentPosts.length === 0 ? (
          <p className="rounded-2xl border border-border bg-bg-overlay p-6 text-sm text-fg-muted">
            No posts yet.{' '}
            <Link href="/admin/posts/new" className="text-accent hover:underline">
              Write the first one
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {recentPosts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/posts/${p.id}/edit`}
                    className="truncate font-medium hover:text-accent"
                  >
                    {p.titleEn}
                  </Link>
                  <p className="text-xs text-fg-muted">
                    {p.status} · {marketLabel(p.market)} ·{' '}
                    {p.publishedAt ? relativeDate(p.publishedAt) : `created ${relativeDate(p.createdAt)}`}
                  </p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  {p.viewCount} views
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-fg-muted">
            Topic queue
          </h2>
          <Link href="/admin/topics" className="text-xs text-accent hover:underline">
            All topics →
          </Link>
        </div>
        {recentTopics.length === 0 ? (
          <p className="rounded-2xl border border-border bg-bg-overlay p-6 text-sm text-fg-muted">
            No researched topics yet. The writer agent will fill this once it runs.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {recentTopics.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.topic}</p>
                  <p className="text-xs text-fg-muted">
                    {t.status} · {marketLabel(t.targetMarket)} · {t.targetAudience}
                  </p>
                </div>
                <Link
                  href={`/admin/posts/new?topic=${encodeURIComponent(t.id)}`}
                  className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs hover:border-accent hover:text-accent"
                >
                  Write post
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg p-5">
      <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        {icon}
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  )
}
