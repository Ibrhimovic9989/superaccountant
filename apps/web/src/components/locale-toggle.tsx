'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Languages } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  locale: 'en' | 'ar'
}

/**
 * Switches the URL between /en/... and /ar/... preserving the rest of the path
 * + query string. Renders as a compact two-letter pill in the AppNav.
 */
export function LocaleToggle({ locale }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function flip() {
    const next = locale === 'en' ? 'ar' : 'en'
    // Replace the leading /en or /ar with the other.
    const nextPath = pathname.replace(/^\/(en|ar)/, `/${next}`)
    startTransition(() => router.push(nextPath))
  }

  return (
    <button
      type="button"
      onClick={flip}
      disabled={isPending}
      aria-label={`Switch to ${locale === 'en' ? 'Arabic' : 'English'}`}
      title={locale === 'en' ? 'العربية' : 'English'}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-bg-elev px-2.5 font-mono text-[11px] font-medium uppercase tracking-wider text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg disabled:opacity-50',
      )}
    >
      <Languages className="h-3 w-3" />
      <span className={cn(locale === 'en' ? 'text-fg' : 'text-fg-subtle')}>EN</span>
      <span className="text-fg-subtle">/</span>
      <span className={cn(locale === 'ar' ? 'text-fg' : 'text-fg-subtle')}>عر</span>
    </button>
  )
}
