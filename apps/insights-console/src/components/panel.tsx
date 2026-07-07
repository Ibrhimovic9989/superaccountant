import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/ui'

export function Panel({
  title,
  subtitle,
  icon: Icon,
  children,
  className,
  right,
}: {
  title: string
  subtitle?: string
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
  right?: React.ReactNode
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-white/10 bg-white/[0.02] p-5',
        className,
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-3.5 w-3.5 text-white/50" />}
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="mt-1 text-[11px] text-white/40">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}
