import {
  Activity,
  BarChart3,
  Bot,
  Clock,
  Eye,
  FileText,
  Flame,
  MousePointerClick,
  Newspaper,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { BlogPerformanceList } from '@/components/blog-performance-list'
import { Empty } from '@/components/empty'
import { Panel } from '@/components/panel'
import { StatTile } from '@/components/stat-tile'
import { TrafficChart } from '@/components/traffic-chart'
import { ViewsByPageChart } from '@/components/views-by-page-chart'
import { joinBlogPerformance } from '@/lib/blog-performance'
import { formatDuration, parseCron } from '@/lib/cron'
import {
  latestInsights,
  listCronJobs,
  listQueuedTopics,
  listRecentCronRuns,
  listRecentPosts,
  postSummary,
} from '@/lib/db'
import {
  ga4DailyUsers,
  ga4DailyViewsByTitle,
  ga4PagesByHost,
  ga4TopPages,
  ga4Totals,
} from '@/lib/ga4'
import { gscPagePerformance, gscTotals } from '@/lib/gsc'
import { compactNumber, percent, timeAgo } from '@/lib/ui'

// Don't ever cache — the dashboard should reflect the exact moment the
// user hits refresh, not a 60s-old snapshot.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const WINDOW_DAYS = 30

export default async function Dashboard() {
  // All independent, all safe-empty on failure — fan out.
  const [
    gaTotals,
    gscT,
    daily,
    topPages,
    dailyByTitle,
    posts,
    postsSummary,
    insights,
    queued,
    cronJobs,
    cronRuns,
    // Per-blog joins — pulled in the same fan-out so the dashboard
    // still lands in one round of parallel HTTP.
    blogHostViews,
    blogPageQueries,
  ] = await Promise.all([
    ga4Totals(WINDOW_DAYS),
    gscTotals(WINDOW_DAYS),
    ga4DailyUsers(WINDOW_DAYS),
    ga4TopPages(WINDOW_DAYS, 10),
    // Chart shows top 5 titles — anything past that turns the legend
    // into a wall of names and lines overlap into mush.
    ga4DailyViewsByTitle(WINDOW_DAYS, 5),
    listRecentPosts(20),
    postSummary(),
    latestInsights(),
    listQueuedTopics(10),
    listCronJobs(),
    listRecentCronRuns(10),
    ga4PagesByHost(WINDOW_DAYS, 'blog.superaccountant.in'),
    gscPagePerformance({
      windowDays: WINDOW_DAYS,
      queriesPerPage: 8,
      pagePrefix: 'blog.superaccountant.in',
    }),
  ])

  const blogPerformance = joinBlogPerformance({
    posts,
    ga4Rows: blogHostViews,
    gscRows: blogPageQueries,
  })

  const autoGenCron = cronJobs.find((j) => j.jobname === 'blog-auto-generate-am')
  const nextPostCron = autoGenCron ? parseCron(autoGenCron.schedule) : null
  const insightsCron = cronJobs.find((j) => j.jobname === 'blog-insights-refresh')
  const nextInsightsCron = insightsCron ? parseCron(insightsCron.schedule) : null

  const snap = insights?.payload ?? null

  return (
    <div className="min-h-screen bg-[hsl(var(--bg))] text-white/90">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="border-b border-white/10 bg-white/[0.02] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
              SuperAccountant
            </p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">
              Insights Console
            </h1>
          </div>
          <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-wider text-white/50">
            <span>Window: {WINDOW_DAYS}d</span>
            <span>
              Last insight: {insights?.refreshedAt ? timeAgo(insights.refreshedAt) : '—'}
            </span>
            <a
              href="https://superaccountant.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-300 hover:text-violet-200"
            >
              superaccountant.in ↗
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {/* ── Top stat tiles ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile
            label="Users · 30d"
            value={compactNumber(gaTotals.users)}
            hint={`${compactNumber(gaTotals.sessions)} sessions`}
            icon={Users}
          />
          <StatTile
            label="Impressions · 30d"
            value={compactNumber(gscT.impressions)}
            hint={`${compactNumber(gscT.clicks)} clicks · ${percent(gscT.ctr)} CTR`}
            icon={Eye}
          />
          <StatTile
            label="Posts published"
            value={compactNumber(postsSummary.totalPublished)}
            hint={`${postsSummary.publishedLast7d} in last 7d · ${postsSummary.agentAuthored} by agent`}
            icon={Newspaper}
          />
          <StatTile
            label="Next post in"
            value={nextPostCron ? formatDuration(nextPostCron.nextFiresInMs) : '—'}
            hint={
              nextPostCron
                ? `${autoGenCron?.schedule ?? ''} UTC · ${nextPostCron.nextFiresAtUtc.toISOString().slice(11, 16)}Z`
                : 'no cron scheduled'
            }
            icon={Clock}
            accent="success"
          />
        </div>

        {/* ── Traffic chart ───────────────────────────────────── */}
        <Panel
          title="Traffic · users + sessions"
          subtitle="Daily unique users (purple) and total sessions (cyan) from GA4"
          icon={Activity}
        >
          <TrafficChart points={daily} />
        </Panel>

        {/* ── Search totals + engagement ─────────────────────── */}
        <div className="grid gap-3 md:grid-cols-3">
          <StatTile
            label="Avg search position"
            value={gscT.position > 0 ? gscT.position.toFixed(1) : '—'}
            hint="lower is better · <10 = page 1"
            icon={Search}
            accent={gscT.position > 0 && gscT.position < 10 ? 'success' : 'default'}
          />
          <StatTile
            label="Page views · 30d"
            value={compactNumber(gaTotals.pageViews)}
            icon={BarChart3}
          />
          <StatTile
            label="Engagement · 30d"
            value={gaTotals.engagementRate > 0 ? percent(gaTotals.engagementRate) : '—'}
            hint="sessions with active engagement"
            icon={Flame}
          />
        </div>

        {/* ── Views-by-page timeseries (matches GA4 Pages chart) ── */}
        <Panel
          title="Views by page title · over time"
          subtitle={`Top ${dailyByTitle.series.length} pages by views · last ${WINDOW_DAYS} days`}
          icon={FileText}
        >
          <ViewsByPageChart data={dailyByTitle} />
        </Panel>

        {/* ── Pages and screens table (matches the GA4 report) ── */}
        <Panel
          title="Pages and screens"
          subtitle="Page title · views · active users · views/user · engagement · events"
          icon={FileText}
        >
          {topPages.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-white/40">
                  <tr className="border-b border-white/10">
                    <th className="pb-2 text-left font-mono uppercase tracking-wider">Page title</th>
                    <th className="pb-2 pr-2 text-right font-mono uppercase tracking-wider">Views</th>
                    <th className="pb-2 pr-2 text-right font-mono uppercase tracking-wider">Users</th>
                    <th className="pb-2 pr-2 text-right font-mono uppercase tracking-wider">V/User</th>
                    <th className="pb-2 pr-2 text-right font-mono uppercase tracking-wider">Eng time</th>
                    <th className="pb-2 text-right font-mono uppercase tracking-wider">Events</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {topPages.map((p) => (
                    <tr key={`${p.pageTitle}-${p.pagePath}`} className="hover:bg-white/[0.02]">
                      <td className="max-w-[340px] py-2 pr-3">
                        <p className="truncate text-[12px] text-white/90">{p.pageTitle}</p>
                        <p className="mt-0.5 truncate font-mono text-[10px] text-white/40">
                          {p.pagePath || '/'}
                        </p>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums text-white/90">
                        {compactNumber(p.views)}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums text-white/70">
                        {compactNumber(p.activeUsers)}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums text-white/60">
                        {p.viewsPerActiveUser > 0 ? p.viewsPerActiveUser.toFixed(2) : '—'}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums text-white/60">
                        {p.avgEngagementTimeSec > 0
                          ? `${Math.round(p.avgEngagementTimeSec)}s`
                          : '—'}
                      </td>
                      <td className="py-2 text-right tabular-nums text-white/60">
                        {compactNumber(p.eventCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="no page data yet" />
          )}
        </Panel>

        {/* ── Top queries (kept as its own single-column panel) ── */}
        <div className="grid gap-6">
          <Panel
            title="Top queries · impressions"
            subtitle="From GSC · last 28 days"
            icon={Search}
          >
            {snap && snap.topQueries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-white/40">
                    <tr className="border-b border-white/10">
                      <th className="pb-2 text-left font-mono uppercase tracking-wider">Query</th>
                      <th className="pb-2 text-right font-mono uppercase tracking-wider">Impr</th>
                      <th className="pb-2 text-right font-mono uppercase tracking-wider">CTR</th>
                      <th className="pb-2 text-right font-mono uppercase tracking-wider">Pos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {snap.topQueries.slice(0, 10).map((q, i) => (
                      <tr key={`${q.query}-${i}`} className="hover:bg-white/[0.02]">
                        <td className="max-w-[280px] truncate py-2 pr-3 text-white/80">{q.query}</td>
                        <td className="py-2 text-right tabular-nums text-white/70">
                          {compactNumber(q.impressions)}
                        </td>
                        <td className="py-2 text-right tabular-nums text-white/60">
                          {percent(q.ctr)}
                        </td>
                        <td className="py-2 text-right tabular-nums text-white/60">
                          {q.position.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty text="no query data yet (GSC needs 24–48h)" />
            )}
          </Panel>
        </div>

        {/* ── Breakouts + declining ───────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel
            title="One nudge from page 1"
            subtitle="Position 4–20 · ≥30 impressions"
            icon={TrendingUp}
            right={
              <span className="rounded-md border border-violet-500/40 bg-violet-500/10 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-violet-300">
                highest leverage
              </span>
            }
          >
            {snap && snap.breakoutCandidates.length > 0 ? (
              <ul className="space-y-3">
                {snap.breakoutCandidates.slice(0, 8).map((c, i) => (
                  <li
                    key={`${c.query}-${i}`}
                    className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white/90">{c.query}</p>
                        <p className="mt-1 truncate font-mono text-[10px] text-white/40">
                          {c.page}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                          pos {c.position.toFixed(1)}
                        </span>
                        <span
                          className={
                            c.suggestedAction === 'refresh'
                              ? 'rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-300'
                              : 'rounded border border-cyan-500/40 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan-300'
                          }
                        >
                          {c.suggestedAction}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="no breakout candidates yet" />
            )}
          </Panel>

          <Panel
            title="Declining pages · week over week"
            subtitle="≥30% drop in last 7d vs -14d/-8d"
            icon={TrendingDown}
          >
            {snap && snap.decliningPages.length > 0 ? (
              <ul className="space-y-3">
                {snap.decliningPages.slice(0, 8).map((d) => (
                  <li
                    key={d.pagePath}
                    className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                  >
                    <p className="truncate font-mono text-[11px] text-white/80">{d.pagePath}</p>
                    <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider">
                      <span className="text-white/40">
                        {d.sessionsRecent} vs {d.sessionsPrevious} sess
                      </span>
                      <span className="text-rose-300">
                        {(d.dropRatio * 100).toFixed(0)}% drop
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="no declining pages" />
            )}
          </Panel>
        </div>

        {/* ── Per-blog performance — views + queries per post ── */}
        <Panel
          title="Blog performance"
          subtitle="Each published post · GA4 views + GSC queries people searched to find it"
          icon={Newspaper}
        >
          <BlogPerformanceList rows={blogPerformance} />
        </Panel>

        {/* ── Queued topics + next-agent-run info ─────────────── */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel
            title="Queued topics"
            subtitle="Researched but not yet written"
            icon={Target}
            className="lg:col-span-2"
          >
            {queued.length > 0 ? (
              <ul className="space-y-2">
                {queued.slice(0, 8).map((t) => (
                  <li
                    key={t.id}
                    className="rounded-md border border-white/5 bg-white/[0.02] p-2"
                  >
                    <p className="line-clamp-2 text-[12px] text-white/80">{t.topic}</p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-white/40">
                      {t.targetAudience} · {timeAgo(t.generatedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="queue is empty" />
            )}
          </Panel>
        </div>

        {/* ── Cron schedule + runs ────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel
            title="Cron schedule"
            subtitle="From Supabase pg_cron"
            icon={Clock}
          >
            <ul className="space-y-3">
              {cronJobs.map((j) => {
                const parsed = parseCron(j.schedule)
                return (
                  <li
                    key={j.jobname}
                    className="flex items-center justify-between rounded-md border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div>
                      <p className="text-[12px] text-white/90">{j.jobname}</p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-white/40">
                        {j.schedule} UTC{' '}
                        {j.active ? (
                          <span className="ml-1 text-emerald-300">active</span>
                        ) : (
                          <span className="ml-1 text-rose-300">paused</span>
                        )}
                      </p>
                    </div>
                    {parsed && (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                        in {formatDuration(parsed.nextFiresInMs)}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
            {nextInsightsCron && (
              <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-white/40">
                next insight refresh · {nextInsightsCron.nextFiresAtUtc.toISOString().slice(11, 16)}
                Z ({formatDuration(nextInsightsCron.nextFiresInMs)})
              </p>
            )}
          </Panel>

          <Panel
            title="Recent cron runs"
            subtitle="Last 10 completed jobs"
            icon={MousePointerClick}
          >
            {cronRuns.length > 0 ? (
              <ul className="space-y-2">
                {cronRuns.map((r, i) => (
                  <li
                    key={`${r.jobname}-${r.start_time?.toISOString?.() ?? i}`}
                    className="flex items-center justify-between rounded-md border border-white/5 bg-white/[0.02] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11px] text-white/80">{r.jobname}</p>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-white/40">
                        {timeAgo(r.start_time)}
                      </p>
                    </div>
                    <span
                      className={
                        r.status === 'succeeded'
                          ? 'font-mono text-[10px] uppercase tracking-wider text-emerald-300'
                          : 'font-mono text-[10px] uppercase tracking-wider text-rose-300'
                      }
                    >
                      {r.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="no run history available" />
            )}
          </Panel>
        </div>

        {/* Footer */}
        <footer className="pt-4 pb-8">
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
            data pulled fresh on every load · dashboard is read-only
          </p>
        </footer>
      </main>
    </div>
  )
}
