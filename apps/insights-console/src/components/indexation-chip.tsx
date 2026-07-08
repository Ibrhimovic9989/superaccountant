import { AlertTriangle, CheckCircle2, Circle, Clock, XCircle } from 'lucide-react'
import type { IndexBucket } from '@/lib/gsc-inspect'

/**
 * Small badge showing indexation state for a blog URL. Five variants
 * cover the buckets a fresh site actually hits:
 *
 *   indexed                 — good, appearing in search
 *   crawled-not-indexed     — Google saw it, decided it's not worth ranking
 *   discovered-not-indexed  — Google knows about it, hasn't crawled yet
 *   excluded                — noindex / blocked / canonical elsewhere
 *   unknown                 — inspection failed or empty response
 *
 * Text intentionally verbose (not just "Indexed" / "Not indexed") so
 * a non-SEO reader can act on it without opening GSC.
 */

const VARIANTS: Record<IndexBucket, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  indexed: {
    label: 'Indexed',
    cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    icon: CheckCircle2,
  },
  'crawled-not-indexed': {
    label: 'Crawled · not indexed',
    cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    icon: AlertTriangle,
  },
  'discovered-not-indexed': {
    label: 'Discovered · not crawled',
    cls: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
    icon: Clock,
  },
  excluded: {
    label: 'Excluded',
    cls: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    icon: XCircle,
  },
  unknown: {
    label: 'Unknown',
    cls: 'border-white/10 bg-white/5 text-white/40',
    icon: Circle,
  },
}

export function IndexationChip({ bucket }: { bucket: IndexBucket }) {
  const v = VARIANTS[bucket]
  const Icon = v.icon
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${v.cls}`}
    >
      <Icon className="h-3 w-3" />
      {v.label}
    </span>
  )
}
