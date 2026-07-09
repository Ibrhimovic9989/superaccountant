import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import type { ProfileAchievement } from '@/lib/community/types'
import { Sticker } from './su/primitives'

/**
 * Horizontal rail of verified achievements above the post grid.
 *
 * Recruiter-facing signal — every card here is cross-checkable
 * against SA's LMS tables, unlike a LinkedIn skill you can just
 * claim. Rendered in neobrutal style so the "verified" quality reads
 * as a sticker on paper, not a subtle chip.
 */

const KIND: Record<
  ProfileAchievement['kind'],
  { emoji: string; label: string; tone: 'mint' | 'coral' | 'brand' | 'grape'; paper: string }
> = {
  'grand-test': { emoji: '🎓', label: 'Grand test', tone: 'mint', paper: 'bg-mint/15' },
  'cohort-complete': { emoji: '🏅', label: 'Cohort', tone: 'coral', paper: 'bg-coral/15' },
  certificate: { emoji: '📜', label: 'Certificate', tone: 'brand', paper: 'bg-brand/15' },
  badge: { emoji: '🎖️', label: 'Badge', tone: 'grape', paper: 'bg-grape/15' },
}

export function AchievementRail({ achievements }: { achievements: ProfileAchievement[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink/60">
          ✓ Verified · {achievements.length}
        </p>
        <Sticker tone="ink" rotate="-3deg" size="sm" className="hidden sm:inline-flex">
          Cross-checked
        </Sticker>
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {achievements.slice(0, 20).map((a) => {
          const meta = KIND[a.kind]
          const CardContent = (
            <div
              className={`flex min-w-[240px] flex-col justify-between rounded-2xl border-2 border-ink p-4 shadow-pop-sm transition-transform hover:-translate-y-0.5 hover:shadow-pop-md ${meta.paper}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl leading-none">{meta.emoji}</span>
                <Sticker tone={meta.tone} rotate="4deg" size="sm">
                  {meta.label}
                </Sticker>
              </div>
              <div className="mt-6">
                <p className="font-display text-base font-extrabold leading-tight text-ink">
                  {a.title}
                </p>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink/60">
                  {a.subtitle}
                </p>
              </div>
              {a.verifyUrl && (
                <div className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] font-extrabold uppercase tracking-wider text-ink">
                  Verify <ExternalLink className="h-3 w-3" />
                </div>
              )}
            </div>
          )
          return a.verifyUrl ? (
            <Link key={a.id} href={a.verifyUrl}>
              {CardContent}
            </Link>
          ) : (
            <div key={a.id}>{CardContent}</div>
          )
        })}
      </div>
    </div>
  )
}
