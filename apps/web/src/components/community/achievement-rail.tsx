import Link from 'next/link'
import { Award, ExternalLink, GraduationCap, Medal, ScrollText } from 'lucide-react'
import type { ProfileAchievement } from '@/lib/community/types'

/**
 * Horizontal rail of verified achievements displayed above the post
 * grid. This is the recruiter-facing signal — every card here is
 * cross-checkable against SA's LMS tables, unlike a LinkedIn skill
 * that a user can just claim.
 */

// Achievement cards use the brand hues at ~15% chroma so the rail
// reads as three cool blues + a warm orange (cohort) — mirrors the
// logomark palette exactly.
const KIND_META: Record<
  ProfileAchievement['kind'],
  { icon: typeof Award; label: string; tone: string }
> = {
  'grand-test': {
    icon: GraduationCap,
    label: 'Grand test',
    tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  },
  'cohort-complete': {
    icon: Medal,
    label: 'Cohort',
    tone: 'border-orange-500/40 bg-orange-500/10 text-orange-200',
  },
  certificate: {
    icon: ScrollText,
    label: 'Certificate',
    tone: 'border-blue-500/40 bg-blue-500/10 text-blue-200',
  },
  badge: {
    icon: Award,
    label: 'Badge',
    tone: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200',
  },
}

export function AchievementRail({ achievements }: { achievements: ProfileAchievement[] }) {
  return (
    <div>
      <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
        Verified · {achievements.length}
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {achievements.slice(0, 20).map((a) => {
          const meta = KIND_META[a.kind]
          const Icon = meta.icon
          const CardContent = (
            <div
              className={`flex min-w-[220px] flex-col justify-between rounded-xl border p-4 ${meta.tone}`}
            >
              <div className="flex items-start justify-between">
                <Icon className="h-4 w-4" />
                <span className="font-mono text-[9px] uppercase tracking-wider opacity-80">
                  {meta.label}
                </span>
              </div>
              <div className="mt-8">
                <p className="text-sm font-semibold leading-tight">{a.title}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider opacity-80">
                  {a.subtitle}
                </p>
              </div>
              {a.verifyUrl && (
                <div className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider opacity-80">
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
