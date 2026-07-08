import 'server-only'
import { loadEnv } from '@sa/config'
import { getAuthClient } from './google-auth'

/**
 * Google Search Console — URL Inspection API.
 *
 * `POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`
 *
 * Tells us for a given URL:
 *   - verdict: PASS / PARTIAL / FAIL / NEUTRAL
 *   - coverageState: "Submitted and indexed" | "Discovered - currently not indexed" | ...
 *   - lastCrawlTime
 *   - robotsTxtState
 *   - indexingState
 *
 * We use it on the console to answer the #1 question for a new blog:
 * "why is the queries table empty on every post?" — usually because
 * Google hasn't indexed them yet, and we now show exactly that.
 *
 * Rate limits are aggressive — 2000/day, 600/minute per property —
 * which is fine for our 20-ish posts × once per console load. We
 * still fan out with a small parallel cap so a batch of 20 doesn't
 * spawn 20 simultaneous sockets during a spike.
 */

const INSPECT_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'
const REQUEST_TIMEOUT_MS = 15_000
const PARALLEL_CAP = 6

export type IndexVerdict = 'PASS' | 'PARTIAL' | 'FAIL' | 'NEUTRAL' | 'VERDICT_UNSPECIFIED'

export type UrlIndexStatus = {
  url: string
  verdict: IndexVerdict
  /** The human-readable state we surface as the badge label. */
  coverageState: string
  /** ISO string; null if never crawled. */
  lastCrawlTime: string | null
  /** Present when Google has indexed the URL. */
  googleCanonical: string | null
  /** True when the fetch itself failed (auth/network); UI treats as unknown. */
  error: boolean
}

type InspectResponse = {
  inspectionResult?: {
    indexStatusResult?: {
      verdict?: IndexVerdict
      coverageState?: string
      lastCrawlTime?: string
      googleCanonical?: string
    }
  }
}

async function inspectOne(args: {
  siteUrl: string
  inspectionUrl: string
  token: string
}): Promise<UrlIndexStatus> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(INSPECT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inspectionUrl: args.inspectionUrl,
        siteUrl: args.siteUrl,
      }),
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console[res.status === 403 ? 'warn' : 'error']('[gsc-inspect] HTTP', res.status, {
        url: args.inspectionUrl,
        body: txt.slice(0, 200),
      })
      return emptyStatus(args.inspectionUrl, true)
    }
    const data = (await res.json()) as InspectResponse
    const idx = data.inspectionResult?.indexStatusResult ?? {}
    return {
      url: args.inspectionUrl,
      verdict: (idx.verdict ?? 'VERDICT_UNSPECIFIED') as IndexVerdict,
      coverageState: idx.coverageState ?? 'Unknown',
      lastCrawlTime: idx.lastCrawlTime ?? null,
      googleCanonical: idx.googleCanonical ?? null,
      error: false,
    }
  } catch (err) {
    console.error('[gsc-inspect] fetch failed', {
      url: args.inspectionUrl,
      err: (err as Error).message,
    })
    return emptyStatus(args.inspectionUrl, true)
  } finally {
    clearTimeout(timer)
  }
}

function emptyStatus(url: string, error: boolean): UrlIndexStatus {
  return {
    url,
    verdict: 'VERDICT_UNSPECIFIED',
    coverageState: error ? 'Inspection failed' : 'Unknown',
    lastCrawlTime: null,
    googleCanonical: null,
    error,
  }
}

/**
 * Inspect every URL in the list. Returns a Map keyed by input URL so
 * callers can join results back to their source rows without extra
 * bookkeeping.
 *
 * If the SA key or site URL is missing we return an empty Map (not
 * null) so the UI can render "unknown" per row rather than crashing.
 */
export async function batchInspect(urls: string[]): Promise<Map<string, UrlIndexStatus>> {
  if (urls.length === 0) return new Map()
  const env = loadEnv()
  const site = env.GSC_SITE_URL
  if (!site) return new Map()
  const auth = await getAuthClient()
  if (!auth) return new Map()

  let token: string | null | undefined
  try {
    const t = await auth.getAccessToken()
    token = t.token
  } catch (err) {
    console.error('[gsc-inspect] token failed', { err: (err as Error).message })
    return new Map()
  }
  if (!token) return new Map()

  // Small parallel window so we don't fire 20 sockets at once.
  const results = new Map<string, UrlIndexStatus>()
  const unique = [...new Set(urls)]
  for (let i = 0; i < unique.length; i += PARALLEL_CAP) {
    const batch = unique.slice(i, i + PARALLEL_CAP)
    const settled = await Promise.all(
      batch.map((url) =>
        inspectOne({ siteUrl: site, inspectionUrl: url, token: token as string }),
      ),
    )
    for (const s of settled) results.set(s.url, s)
  }
  return results
}

// ── UI helpers ──────────────────────────────────────────────

/**
 * Map GSC's slightly awkward coverageState strings to one of five
 * clean buckets we render as a badge on each blog card.
 */
export type IndexBucket =
  | 'indexed'
  | 'crawled-not-indexed'
  | 'discovered-not-indexed'
  | 'excluded'
  | 'unknown'

export function bucketFromStatus(s: UrlIndexStatus | undefined): IndexBucket {
  if (!s || s.error) return 'unknown'
  const cov = s.coverageState.toLowerCase()
  if (s.verdict === 'PASS' || cov.includes('indexed') && !cov.includes('not indexed')) {
    return 'indexed'
  }
  if (cov.includes('crawled') && cov.includes('not indexed')) return 'crawled-not-indexed'
  if (cov.includes('discovered') && cov.includes('not indexed')) return 'discovered-not-indexed'
  if (cov.includes('excluded') || cov.includes('blocked') || cov.includes('noindex')) {
    return 'excluded'
  }
  return 'unknown'
}
