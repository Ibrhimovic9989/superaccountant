import { CheckCircle2, Sparkles, Wallet } from 'lucide-react'
import Link from 'next/link'
import type { SupportedLocale } from '@sa/i18n'
import type { LessonPhaseProgress } from '@/lib/loyalty/phase-progress'

/**
 * Inline lesson banner that surfaces SA Points context:
 *   • Phase progress (completed / total)
 *   • The 200 SA reward waiting at phase end (or a "Earned ✓" pill if
 *     it's already credited and the student is revisiting a lesson).
 *   • Link to /rewards so students can dig into the full program.
 *
 * Renders compactly so it doesn't dominate the lesson page.
 */
export function SaPointsHint({
  locale,
  progress,
}: {
  locale: SupportedLocale
  progress: LessonPhaseProgress | null
}) {
  if (!progress) return null

  const phaseTitle = locale === 'ar' ? progress.phaseTitleAr : progress.phaseTitleEn
  const remaining = Math.max(0, progress.totalLessons - progress.completedLessons)

  if (progress.alreadyAwarded) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-2.5 text-xs text-success">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          <strong className="font-semibold">Phase {progress.phaseOrder} · {phaseTitle}</strong> —
          {' '}
          <strong>{progress.awardPoints} SA</strong> already in your wallet.
        </span>
        <Link
          href={`/${locale}/rewards`}
          className="shrink-0 underline-offset-2 hover:underline"
        >
          How rewards work
        </Link>
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-xl border border-accent/30 bg-accent-soft/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Sparkles className="h-4 w-4 shrink-0 text-accent" />
        <span className="text-xs text-fg">
          <strong className="font-semibold">Phase {progress.phaseOrder} · {phaseTitle}</strong>
          {' · '}
          <span className="text-fg-muted">
            {progress.completedLessons}/{progress.totalLessons} lessons done
          </span>
        </span>
        <span className="ms-auto inline-flex items-center gap-1 text-xs font-medium text-success">
          <Wallet className="h-3.5 w-3.5" />
          {remaining === 0 ? (
            <>Complete one final review to earn <strong>{progress.awardPoints} SA</strong></>
          ) : (
            <>
              {remaining} {remaining === 1 ? 'lesson' : 'lessons'} to{' '}
              <strong>+{progress.awardPoints} SA</strong>
            </>
          )}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] text-fg-subtle">
        SA Cash = SuperAccountant rewards. 1 SA = ₹1 off your next cohort.{' '}
        <Link href={`/${locale}/rewards`} className="text-accent underline-offset-2 hover:underline">
          See all ways to earn
        </Link>
      </p>
    </div>
  )
}
