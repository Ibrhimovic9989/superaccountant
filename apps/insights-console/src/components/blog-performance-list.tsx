import { Bot, ExternalLink } from 'lucide-react'
import type { BlogPerfRow } from '@/lib/blog-performance'
import { compactNumber, percent, timeAgo } from '@/lib/ui'

/**
 * Per-blog performance list. One card per published post with:
 *   - GA4: views, users, events
 *   - GSC: impressions, clicks, CTR, avg position
 *   - Top queries that surfaced this page in Google Search
 *
 * Server-rendered; no interactivity needed — the data is fresh on
 * every page load and there's no real "expand" behaviour beyond
 * "click through to the blog".
 */

export function BlogPerformanceList({ rows }: { rows: BlogPerfRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.01]">
        <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">
          no published posts yet
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {rows.map(({ post, blogUrl, ga4, gsc }) => {
        const hasSignal = ga4.views > 0 || gsc.impressions > 0
        return (
          <li
            key={post.id}
            className="rounded-lg border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-white/15"
          >
            {/* Header row: title + market + agent flag + link */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <a
                  href={blogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-start gap-1.5"
                >
                  <span className="text-sm font-medium text-white/90 group-hover:text-violet-300">
                    {post.titleEn}
                  </span>
                  <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-white/30 group-hover:text-violet-300" />
                </a>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-white/40">
                  <span>{post.market}</span>
                  {post.authorAgentId && (
                    <span className="inline-flex items-center gap-1 text-violet-300/70">
                      <Bot className="h-3 w-3" /> agent
                    </span>
                  )}
                  <span>{timeAgo(post.publishedAt ?? post.createdAt)}</span>
                  {post.targetKeywords.length > 0 && (
                    <span className="truncate">kw: {post.targetKeywords.slice(0, 3).join(', ')}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Metrics row */}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
              <Metric label="Views" value={compactNumber(ga4.views)} accent={ga4.views > 0} />
              <Metric label="Users" value={compactNumber(ga4.activeUsers)} accent={ga4.activeUsers > 0} />
              <Metric
                label="Impr"
                value={compactNumber(gsc.impressions)}
                accent={gsc.impressions > 0}
              />
              <Metric label="Clicks" value={compactNumber(gsc.clicks)} accent={gsc.clicks > 0} />
              <Metric
                label="CTR"
                value={gsc.impressions > 0 ? percent(gsc.ctr) : '—'}
              />
              <Metric
                label="Avg pos"
                value={gsc.position > 0 ? gsc.position.toFixed(1) : '—'}
                accent={gsc.position > 0 && gsc.position <= 10}
              />
            </div>

            {/* Queries: what people searched to see this page */}
            {gsc.topQueries.length > 0 ? (
              <div className="mt-4">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-white/50">
                  What people searched · top {gsc.topQueries.length}
                </p>
                <div className="overflow-hidden rounded-md border border-white/5">
                  <table className="w-full text-xs">
                    <thead className="bg-white/[0.02] text-white/40">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-mono uppercase tracking-wider">
                          Query
                        </th>
                        <th className="px-3 py-1.5 text-right font-mono uppercase tracking-wider">
                          Impr
                        </th>
                        <th className="px-3 py-1.5 text-right font-mono uppercase tracking-wider">
                          Clicks
                        </th>
                        <th className="px-3 py-1.5 text-right font-mono uppercase tracking-wider">
                          Pos
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {gsc.topQueries.map((q, i) => (
                        <tr key={`${q.query}-${i}`} className="hover:bg-white/[0.02]">
                          <td className="max-w-[380px] truncate px-3 py-1.5 text-white/80">
                            {q.query}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-white/70">
                            {compactNumber(q.impressions)}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-white/70">
                            {compactNumber(q.clicks)}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-white/60">
                            {q.position.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-white/30">
                {hasSignal
                  ? 'no search queries yet · direct/social/referral only'
                  : 'no traffic or queries yet — give it a week'}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-md border border-white/5 bg-white/[0.01] px-2 py-1.5">
      <p className="font-mono text-[9px] uppercase tracking-wider text-white/40">{label}</p>
      <p
        className={
          accent
            ? 'mt-0.5 text-sm font-medium tabular-nums text-emerald-300'
            : 'mt-0.5 text-sm font-medium tabular-nums text-white/70'
        }
      >
        {value}
      </p>
    </div>
  )
}
