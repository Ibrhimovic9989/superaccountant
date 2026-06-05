'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

/**
 * Theme toggle — clone of apps/marketing's. Cycles system → dark → light → system
 * via [data-theme] on <html>, persisted in localStorage('sa-theme'). Keeping
 * the same localStorage key as the marketing app so a user who toggled there
 * carries their preference here.
 */
type Theme = 'light' | 'dark' | 'system'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)
  const [systemDark, setSystemDark] = useState(false)

  useEffect(() => {
    setMounted(true)
    setSystemDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
    let stored: Theme = 'system'
    try {
      const raw = localStorage.getItem('sa-theme')
      if (raw === 'dark' || raw === 'light' || raw === 'system') stored = raw
    } catch {}
    setTheme(stored)
    apply(stored)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  function apply(t: Theme) {
    const root = document.documentElement
    if (t === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', t)
  }

  function toggle() {
    const isDark = theme === 'dark' || (theme === 'system' && systemDark)
    const next: Theme = isDark ? 'light' : 'dark'
    setTheme(next)
    apply(next)
    try {
      localStorage.setItem('sa-theme', next)
    } catch {}
  }

  const isDark = mounted && (theme === 'dark' || (theme === 'system' && systemDark))

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-bg-elev text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg"
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  )
}
