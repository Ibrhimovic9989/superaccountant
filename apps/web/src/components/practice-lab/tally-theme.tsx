'use client'

/**
 * Tally Prime visual theme wrapper. Provides the classic Tally look:
 * - Deep navy background (#0c1021)
 * - Monospace text throughout
 * - Sharp corners (no border-radius)
 * - Yellow highlights for selections
 * - White text on dark background
 * - Single-pixel borders
 * - F-key shortcut bar at the bottom
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Tally Shell ────────────────────────────────────────────

export function TallyShell({ children, company }: { children: React.ReactNode; company: string }) {
  return (
    <div className="tally-shell flex flex-col overflow-hidden border border-tally-border bg-tally-bg font-mono text-tally-fg">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-tally-border bg-tally-header px-3 py-1.5">
        <span className="text-xs font-bold text-tally-yellow">{company}</span>
        <span className="text-[10px] text-tally-dim">SuperAccountant Practice Lab</span>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}

// ─── Tally Panel ────────────────────────────────────────────

export function TallyPanel({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col border border-tally-border', className)}>
      <div className="border-b border-tally-border bg-tally-header px-3 py-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-tally-yellow">
          {title}
        </span>
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}

// ─── Tally Row ──────────────────────────────────────────────

export function TallyRow({
  children,
  selected,
  done,
  correct,
  wrong,
  onClick,
  className,
}: {
  children: React.ReactNode
  selected?: boolean
  done?: boolean
  correct?: boolean
  wrong?: boolean
  onClick?: () => void
  className?: string
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 border-b border-tally-border/50 px-3 py-1.5 text-xs transition-colors',
        onClick && 'cursor-pointer',
        selected && 'bg-tally-select text-tally-bg',
        !selected && done && 'text-tally-green',
        !selected && correct && 'bg-tally-green/10',
        !selected && wrong && 'bg-red-900/20',
        !selected && !done && !correct && !wrong && 'hover:bg-tally-dim/10',
        className,
      )}
    >
      {children}
    </div>
  )
}

// ─── Tally Input ────────────────────────────────────────────

export function TallyInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  type = 'text',
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  type?: string
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2 border-b border-tally-border/30 px-3 py-1.5', className)}>
      <span className="w-28 shrink-0 text-[10px] uppercase text-tally-dim">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-transparent text-xs text-tally-fg outline-none placeholder:text-tally-dim/50 disabled:text-tally-dim"
      />
    </div>
  )
}

// ─── Tally Autocomplete Select ──────────────────────────────

export function TallyAccountPicker({
  label,
  value,
  onChange,
  accounts,
}: {
  label: string
  value: string
  onChange: (code: string) => void
  accounts: { code: string; name: string; subGroup: string }[]
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const selected = accounts.find((a) => a.code === value)

  const filtered = search.trim()
    ? accounts.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.code.toLowerCase().includes(search.toLowerCase()),
      )
    : accounts

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 border-b border-tally-border/30 px-3 py-1.5 cursor-pointer"
        onClick={() => {
          setOpen(true)
          setSearch('')
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
      >
        <span className="w-28 shrink-0 text-[10px] uppercase text-tally-dim">{label}</span>
        <span className={cn('flex-1 text-xs', value ? 'text-tally-yellow' : 'text-tally-dim/50')}>
          {selected?.name ?? 'Type to search...'}
        </span>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 max-h-52 overflow-auto border border-tally-border bg-tally-bg shadow-lg">
          <div className="sticky top-0 border-b border-tally-border bg-tally-header px-3 py-1">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type account name..."
              className="w-full bg-transparent text-xs text-tally-fg outline-none placeholder:text-tally-dim"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false)
                if (e.key === 'Enter' && filtered[0]) {
                  onChange(filtered[0].code)
                  setOpen(false)
                }
              }}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
          </div>
          {filtered.map((acc) => (
            <div
              key={acc.code}
              onMouseDown={() => {
                onChange(acc.code)
                setOpen(false)
              }}
              className={cn(
                'cursor-pointer border-b border-tally-border/30 px-3 py-1 text-xs transition-colors hover:bg-tally-select hover:text-tally-bg',
                acc.code === value && 'bg-tally-select/20 text-tally-yellow',
              )}
            >
              <span>{acc.name}</span>
              <span className="ms-2 text-[9px] text-tally-dim">({acc.subGroup})</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-[10px] text-tally-dim">No match</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── F-Key Bar ──────────────────────────────────────────────

type FKey = { key: string; label: string; onClick?: () => void; active?: boolean }

export function TallyFKeyBar({ keys }: { keys: FKey[] }) {
  return (
    <div className="flex flex-wrap items-center gap-px border-t border-tally-border bg-tally-header">
      {keys.map((k) => (
        <button
          key={k.key}
          type="button"
          onClick={k.onClick}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 text-[10px] transition-colors',
            k.active
              ? 'bg-tally-select text-tally-bg'
              : 'text-tally-dim hover:bg-tally-dim/20 hover:text-tally-fg',
          )}
        >
          <span className="font-bold text-tally-yellow">{k.key}</span>
          <span>{k.label}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Amount display ─────────────────────────────────────────

export function TallyAmount({
  value,
  type,
}: {
  value: number
  type?: 'dr' | 'cr'
}) {
  return (
    <span
      className={cn(
        'tabular-nums',
        type === 'cr' && 'text-tally-green',
        type === 'dr' && 'text-tally-yellow',
      )}
    >
      {value.toLocaleString('en-IN')}
    </span>
  )
}
