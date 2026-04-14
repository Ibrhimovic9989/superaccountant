import type { ReactNode } from 'react'
import Link from 'next/link'
import { Logomark, Wordmark } from '@/components/brand/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { LocaleToggle } from '@/components/locale-toggle'
import { DotPattern } from '@/components/magicui/dot-pattern'
import { BlurFade } from '@/components/magicui/blur-fade'
import { cn } from '@/lib/utils'

type Props = {
  locale: 'en' | 'ar'
  children: ReactNode
}

/**
 * Centered shell for unauthenticated pages: sign-in, verify-request, auth-error.
 * Brand mark top-left, locale + theme toggle top-right, glowing dot-pattern
 * background, content centered in a max-w-md card-like column.
 */
export function AuthShell({ locale, children }: Props) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-bg text-fg">
      {/* Ambient dot-pattern background */}
      <DotPattern
        glow
        className={cn(
          '[mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]',
          'text-fg-subtle/40',
        )}
      />

      {/* Top bar */}
      <header className="relative z-10 flex h-16 items-center justify-between px-6">
        <Link href={`/${locale}`} className="group flex items-center gap-2.5">
          <Logomark size={36} />
          <Wordmark className="text-base" />
        </Link>
        <div className="flex items-center gap-2">
          <LocaleToggle locale={locale} />
          <ThemeToggle />
        </div>
      </header>

      {/* Centered card */}
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col items-center justify-center px-6 py-12">
        <BlurFade delay={0.05}>
          <div className="w-full">{children}</div>
        </BlurFade>
      </main>
    </div>
  )
}
