'use client'

import * as React from 'react'
import { Lightbulb, Loader2 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { cn } from '@/lib/utils'
import { Button, type ButtonProps } from '@/components/ui/button'
import { ACCOUNTING_FACTS } from '@/lib/loading-facts'

/**
 * Loading primitives. One source of truth for every spinner, skeleton,
 * shimmer block, rotating message, and pending submit button in the app.
 */

// ─── Skeleton ───────────────────────────────────────────────
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton', className)} {...props} />
}

// ─── Inline spinner ─────────────────────────────────────────
export function Spinner({
  className,
  label,
}: {
  className?: string
  label?: string
}) {
  return (
    <span className="inline-flex items-center gap-2 text-fg-muted">
      <Loader2 className={cn('h-4 w-4 animate-spin', className)} />
      {label ? <span className="text-sm">{label}</span> : null}
    </span>
  )
}

// ─── Three-dot pulsing indicator ────────────────────────────
export function PulseDots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      <span
        className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current"
        style={{ animationDelay: '0.15s' }}
      />
      <span
        className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current"
        style={{ animationDelay: '0.3s' }}
      />
    </span>
  )
}

// ─── Rotating loading message ───────────────────────────────
export function RotatingMessage({
  messages,
  intervalMs = 2200,
  className,
}: {
  messages: readonly string[]
  intervalMs?: number
  className?: string
}) {
  const [idx, setIdx] = React.useState(0)
  React.useEffect(() => {
    if (messages.length <= 1) return
    const id = setInterval(() => setIdx((i) => (i + 1) % messages.length), intervalMs)
    return () => clearInterval(id)
  }, [messages.length, intervalMs])
  return (
    <span key={idx} className={cn('inline-block animate-pulse', className)}>
      {messages[idx]}
    </span>
  )
}

// ─── Full-card loading state ────────────────────────────────
export function LoadingCard({
  messages,
  icon,
  className,
  locale = 'en',
  showFact = true,
}: {
  messages: readonly string[]
  icon?: React.ReactNode
  className?: string
  locale?: 'en' | 'ar'
  showFact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-6 rounded-2xl border border-border bg-bg-elev p-12 text-center',
        className,
      )}
    >
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-bg">
        {icon ?? <Loader2 className="h-5 w-5 animate-spin text-accent" />}
      </div>
      <p className="text-sm text-fg-muted">
        <RotatingMessage messages={messages} />
      </p>
      {showFact && <LoadingFacts locale={locale} className="mt-2 w-full" />}
    </div>
  )
}

// ─── Loading facts strip ────────────────────────────────────
// Rotates accounting facts on every loading screen.
// Picks a fresh random fact on mount, then cycles every ~6.5s.
// If no `locale` is passed, auto-detects from /en/... or /ar/... in the URL.

const FACT_ROTATE_MS = 6500

export function LoadingFacts({
  locale,
  className,
  compact = false,
  floating = false,
}: {
  locale?: 'en' | 'ar'
  className?: string
  compact?: boolean
  /** Pin to the bottom-center of the viewport so it stays visible above any skeleton. */
  floating?: boolean
}) {
  const path = usePathname()
  const resolvedLocale: 'en' | 'ar' = locale ?? (path?.startsWith('/ar') ? 'ar' : 'en')
  const [idx, setIdx] = React.useState(() => Math.floor(Math.random() * ACCOUNTING_FACTS.length))

  React.useEffect(() => {
    const id = setInterval(
      () => setIdx((i) => (i + 1 + Math.floor(Math.random() * 3)) % ACCOUNTING_FACTS.length),
      FACT_ROTATE_MS,
    )
    return () => clearInterval(id)
  }, [])

  const fact = ACCOUNTING_FACTS[idx]?.[resolvedLocale] ?? ''
  const eyebrow = resolvedLocale === 'ar' ? 'هل تعلم؟' : 'Did you know?'

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-start gap-2.5 text-xs leading-relaxed text-fg-muted',
          className,
        )}
      >
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
        <span key={idx} className="animate-pulse">
          {fact}
        </span>
      </div>
    )
  }

  const card = (
    <div
      className={cn(
        'mx-auto max-w-md rounded-2xl border border-border bg-bg-elev/90 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl',
        className,
      )}
    >
      <div className="mb-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        <Lightbulb className="h-3 w-3 text-accent" />
        {eyebrow}
      </div>
      <p key={idx} className="animate-pulse text-sm leading-relaxed text-fg">
        {fact}
      </p>
    </div>
  )

  if (floating) {
    return (
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-6">
        <div className="pointer-events-auto w-full max-w-md">{card}</div>
      </div>
    )
  }

  return card
}

// ─── Server-action submit button with pending state ─────────
type SubmitButtonProps = ButtonProps & {
  pendingLabel?: string
  children: React.ReactNode
}

export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  ...rest
}: SubmitButtonProps) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...rest}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
