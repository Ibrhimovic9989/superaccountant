'use client'

import * as React from 'react'
import Link from 'next/link'
import { LayoutDashboard, LogOut, User } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { signOutAction } from '@/lib/actions/auth'
import { resetIdentity, track } from '@/lib/analytics'
import { cn } from '@/lib/utils'

type Props = {
  locale: 'en' | 'ar'
  userName: string | null
  userEmail: string
}

const COPY = {
  en: { dashboard: 'Dashboard', profile: 'Profile', signOut: 'Sign out' },
  ar: { dashboard: 'لوحة التحكم', profile: 'الملف الشخصي', signOut: 'تسجيل الخروج' },
} as const

/**
 * Avatar button with dropdown — Profile link + Sign out action.
 * Custom dropdown (no Radix dependency) with click-outside + Escape handling.
 */
export function UserMenu({ locale, userName, userEmail }: Props) {
  const t = COPY[locale]
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const initial = (userName ?? userEmail)[0]?.toUpperCase() ?? '·'
  const displayName = userName?.trim() || userEmail.split('@')[0]

  React.useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative ms-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-full border bg-bg-elev font-mono text-xs font-semibold transition-colors',
          open
            ? 'border-accent text-accent'
            : 'border-border text-fg hover:border-border-strong',
        )}
      >
        {initial}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            role="menu"
            className="absolute end-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-bg-elev shadow-2xl shadow-black/30 backdrop-blur"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-medium text-fg">{displayName}</p>
              <p className="mt-0.5 truncate text-xs text-fg-muted">{userEmail}</p>
            </div>

            <div className="p-1">
              <Link
                href={`/${locale}/dashboard`}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-fg transition-colors hover:bg-bg-overlay"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-fg-muted" />
                {t.dashboard}
              </Link>
              <Link
                href={`/${locale}/profile`}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-fg transition-colors hover:bg-bg-overlay"
              >
                <User className="h-3.5 w-3.5 text-fg-muted" />
                {t.profile}
              </Link>

              <form
                action={async () => {
                  track('signed_out')
                  resetIdentity()
                  await signOutAction(locale)
                }}
              >
                <button
                  type="submit"
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-start text-sm text-fg transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {t.signOut}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
