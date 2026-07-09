import type { ReactNode } from 'react'

/**
 * Neobrutalism primitives for the SuperAccountant community surface.
 *
 * Ported from studentunion-v2's UI package — chunky ink borders,
 * hard offset shadows, rotated sticker badges, extrabold display
 * type. Colors mapped to SA brand: brand = royal blue, coral = SA
 * orange, mint = SA emerald. Kept scoped to the community folder so
 * lessons/dashboard keep their existing neutral aesthetic until we
 * decide to widen the rollout.
 */

// ── Buttons ─────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'accent' | 'dark' | 'outline' | 'ghost'
type ButtonSize = 'lg' | 'md' | 'sm'

/**
 * Sticker button classes. Apply to <button> or <Link>. Uses the
 * .btn-pop utility from globals.css for the hover/press choreography.
 */
export function buttonStyles(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
): string {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full font-bold tracking-tight transition-all duration-150 disabled:opacity-60 disabled:pointer-events-none'
  const sizes: Record<ButtonSize, string> = {
    lg: 'px-8 py-4 text-base',
    md: 'px-6 py-3 text-sm',
    sm: 'px-4 py-2 text-sm',
  }
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-brand text-white btn-pop',
    accent: 'bg-coral text-white btn-pop',
    dark: 'bg-ink text-cream btn-pop',
    outline:
      'border-2 border-ink bg-transparent text-ink hover:bg-ink hover:text-cream transition-colors',
    ghost: 'text-ink/65 hover:bg-ink/5 hover:text-ink',
  }
  return `${base} ${sizes[size]} ${variants[variant]}`
}

// ── Card ────────────────────────────────────────────────────────

export function Card({
  className = '',
  pop = false,
  children,
  as: Tag = 'div',
}: {
  className?: string
  pop?: boolean
  children: ReactNode
  as?: 'div' | 'article' | 'section'
}) {
  const look = pop
    ? 'border-2 border-ink shadow-pop-md hover:-translate-y-0.5 hover:shadow-pop transition-transform'
    : 'border-2 border-ink/10'
  return (
    <Tag className={`rounded-2xl bg-white ${look} ${className}`}>
      {children}
    </Tag>
  )
}

// ── PageHeader ──────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  action,
}: {
  title: string
  subtitle?: string
  eyebrow?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <span className="mb-2 inline-block font-mono text-xs font-bold uppercase tracking-[0.18em] text-coral">
            {eyebrow}
          </span>
        )}
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-ink/60">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Eyebrow chip ────────────────────────────────────────────────

export function Eyebrow({
  children,
  dotColor = 'coral',
}: {
  children: ReactNode
  dotColor?: 'coral' | 'mint' | 'brand' | 'grape'
}) {
  const dotClass = {
    coral: 'bg-coral',
    mint: 'bg-mint',
    brand: 'bg-brand',
    grape: 'bg-grape',
  }[dotColor]
  return (
    <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-ink shadow-pop-xs">
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {children}
    </span>
  )
}

// ── Sticker ─────────────────────────────────────────────────────

const STICKER_TONES = {
  brand: 'bg-brand text-white',
  coral: 'bg-coral text-white',
  mint: 'bg-mint text-white',
  ink: 'bg-ink text-cream',
  grape: 'bg-grape text-white',
  sky: 'bg-sky text-ink',
  blush: 'bg-blush text-ink',
  butter: 'bg-butter text-ink',
  white: 'bg-white text-ink',
} as const

export function Sticker({
  tone = 'brand',
  rotate = '-3deg',
  size = 'md',
  className = '',
  children,
}: {
  tone?: keyof typeof STICKER_TONES
  rotate?: string
  size?: 'sm' | 'md'
  className?: string
  children: ReactNode
}) {
  const sizing =
    size === 'sm'
      ? 'px-2.5 py-0.5 text-[10px]'
      : 'px-3 py-1 text-xs'
  return (
    <span
      style={{ rotate }}
      className={`inline-flex items-center gap-1 rounded-full border-2 border-ink font-extrabold uppercase tracking-wide shadow-pop-xs ${sizing} ${STICKER_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
