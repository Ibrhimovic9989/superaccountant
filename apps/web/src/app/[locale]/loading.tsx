import { Loader2 } from 'lucide-react'
import { LoadingFacts } from '@/components/ui/loading'

/**
 * Default fallback for any [locale] route that doesn't ship its own loading.tsx.
 * Branded full-screen loader — this is also what the user sees during the
 * post-OAuth callback gap between Google → /api/auth/callback → dashboard.
 */
export default function LocaleLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-bg px-6 text-fg">
      <div className="flex items-center gap-3">
        <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg bg-fg text-bg">
          <span className="font-mono text-sm font-bold leading-none">SA</span>
        </span>
        <span className="text-lg font-semibold tracking-tight">SuperAccountant</span>
      </div>
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
      <LoadingFacts />
    </div>
  )
}
