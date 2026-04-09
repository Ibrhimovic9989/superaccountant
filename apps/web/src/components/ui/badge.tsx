import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors',
  {
    variants: {
      variant: {
        default: 'border border-border bg-bg-overlay text-fg-muted',
        accent: 'border border-accent/30 bg-accent-soft text-accent',
        success: 'border border-success/30 bg-success/10 text-success',
        warning: 'border border-warning/30 bg-warning/10 text-warning',
        outline: 'border border-border-strong text-fg-muted',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
