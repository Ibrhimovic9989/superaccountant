import Link from 'next/link'
import { listRecentTopicsForAdmin } from '@/lib/blog/store'
import { marketLabel, relativeDate } from '@/lib/blog/format'

export const dynamic = 'force-dynamic'

export default async function AdminTopicsPage() {
  const topics = await listRecentTopicsForAdmin(100)

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Topic queue</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Topics surfaced by the SEO/GEO research agent. Click <em>Write post</em> to spin one up
          with prefilled keywords + market.
        </p>
      </header>

      {topics.length === 0 ? (
        <p className="rounded-2xl border border-border bg-bg-overlay p-10 text-center text-sm text-fg-muted">
          No topics in the queue yet. The writer agent will populate this once it runs.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-bg-overlay text-left font-mono text-[11px] uppercase tracking-wider text-fg-muted">
              <tr>
                <th className="px-5 py-3">Topic</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Market</th>
                <th className="px-5 py-3">Audience</th>
                <th className="px-5 py-3">Researched</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topics.map((t) => (
                <tr key={t.id}>
                  <td className="max-w-md px-5 py-3 align-top">
                    <p className="font-medium">{t.topic}</p>
                    {t.sourceKeywords.length > 0 && (
                      <p className="mt-1 truncate text-xs text-fg-subtle">
                        {t.sourceKeywords.join(', ')}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3 align-top text-fg-muted">{t.status}</td>
                  <td className="px-5 py-3 align-top text-fg-muted">
                    {marketLabel(t.targetMarket)}
                  </td>
                  <td className="px-5 py-3 align-top text-fg-muted">{t.targetAudience}</td>
                  <td className="px-5 py-3 align-top text-fg-muted">
                    {relativeDate(t.generatedAt)}
                  </td>
                  <td className="px-5 py-3 text-right align-top">
                    <Link
                      href={`/admin/posts/new?topic=${encodeURIComponent(t.id)}`}
                      className="text-xs text-accent hover:underline"
                    >
                      Write post →
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
