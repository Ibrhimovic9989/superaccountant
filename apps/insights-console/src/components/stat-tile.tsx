import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/ui'

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  accent?: 'default' | 'success' | 'warn' | 'danger'
}) {
  const accentColour =
    accent === 'success'
      ? 'text-emerald-400'
      : accent === 'warn'
        ? 'text-amber-400'
        : accent === 'danger'
          ? 'text-rose-400'
          : 'text-fg'
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
          {label}
        </span>
        {Icon && <Icon className="h-3.5 w-3.5 text-white/40" />}
      </div>
      <div className={cn('mt-4 font-mono text-3xl font-medium tabular-nums', accentColour)}>
        {value}
      </div>
      {hint && (
        <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/40">
          {hint}
        </div>
      )}
    </div>
  )
}
