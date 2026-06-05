import Link from 'next/link'
import { Plus } from 'lucide-react'
import { listAllPostsForAdmin } from '@/lib/blog/store'
import type { BlogMarket, BlogPostStatus } from '@/lib/blog/types'
import { marketLabel, relativeDate } from '@/lib/blog/format'

export const dynamic = 'force-dynamic'

const STATUS_OPTIONS: (BlogPostStatus | 'all')[] = [
  'all',
  'draft',
  'scheduled',
  'published',
  'archived',
]
const MARKET_OPTIONS: (BlogMarket | 'all')[] = ['all', 'india', 'ksa', 'global']

type SearchParams = { status?: string; market?: string }

function parseStatus(v?: string): BlogPostStatus | 'all' {
  return (STATUS_OPTIONS as string[]).includes(v ?? '')
    ? ((v as BlogPostStatus) ?? 'all')
    : 'all'
}
function parseMarket(v?: string): BlogMarket | 'all' {
  return (MARKET_OPTIONS as string[]).includes(v ?? '')
    ? ((v as BlogMarket) ?? 'all')
    : 'all'
}

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const status = parseStatus(sp.status)
  const market = parseMarket(sp.market)

  const posts = await listAllPostsForAdmin({
    statusFilter: status,
    marketFilter: market,
    limit: 200,
  })

  return (
    <div>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Posts</h1>
          <p className="mt-1 text-sm text-fg-muted">All posts, filterable by status + market.</p>
        </div>
        <Link
          href="/admin/posts/new"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          New post
        </Link>
      </header>

      <form className="mb-6 flex flex-wrap items-end gap-3 text-sm">
        <FilterSelect name="status" value={status} options={STATUS_OPTIONS} label="Status" />
        <FilterSelect name="market" value={market} options={MARKET_OPTIONS} label="Market" />
        <button
          type="submit"
          className="rounded-lg border border-border px-3 py-1.5 text-xs hover:border-border-strong"
        >
          Apply
        </button>
      </form>

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-border bg-bg-overlay p-10 text-center text-sm text-fg-muted">
          No posts match these filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-bg-overlay text-left font-mono text-[11px] uppercase tracking-wider text-fg-muted">
              <tr>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Market</th>
                <th className="px-5 py-3">Published</th>
                <th className="px-5 py-3 text-right">Views</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {posts.map((p) => (
                <tr key={p.id}>
                  <td className="max-w-md px-5 py-3 align-top">
                    <Link href={`/admin/posts/${p.id}`} className="font-medium hover:text-accent">
                      {p.titleEn}
                    </Link>
                    <p className="truncate text-xs text-fg-subtle">/{p.slug}</p>
                  </td>
                  <td className="px-5 py-3 align-top">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-5 py-3 align-top text-fg-muted">{marketLabel(p.market)}</td>
                  <td className="px-5 py-3 align-top text-fg-muted">
                    {p.publishedAt ? relativeDate(p.publishedAt) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right align-top text-fg-muted">{p.viewCount}</td>
                  <td className="px-5 py-3 align-top text-right">
                    <Link
                      href={`/admin/posts/${p.id}/edit`}
                      className="text-xs text-accent hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FilterSelect({
  name,
  value,
  options,
  label,
}: {
  name: string
  value: string
  options: readonly string[]
  label: string
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-fg-muted">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'published'
      ? 'border-success/30 bg-success/10 text-success'
      : status === 'scheduled'
        ? 'border-warning/30 bg-warning/10 text-warning'
        : status === 'archived'
          ? 'border-border bg-bg-overlay text-fg-muted'
          : 'border-border bg-bg-overlay text-fg-muted'
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone}`}
    >
      {status}
    </span>
  )
}
