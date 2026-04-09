/**
 * Edge proxy. Composes two concerns:
 *
 *   1. **Locale routing** — bare `/` redirects to `/en`. Any path without a
 *      locale prefix gets one (English by default; we can sniff Accept-Language
 *      later).
 *
 *   2. **Auth guard** for protected segments. Unauthenticated requests bounce
 *      to `/[locale]/sign-in`.
 *
 * Replaces the previous next-intl middleware (Next 16 + Turbopack doesn't play
 * well with the next-intl plugin). Locale handling is now ~20 lines of plain
 * NextResponse logic, which is all we actually needed.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { LOCALES, DEFAULT_LOCALE } from '@sa/i18n'

const PROTECTED_SEGMENTS = ['/dashboard', '/tutor', '/assignments', '/grand-test', '/certificate', '/lessons']

function hasLocalePrefix(pathname: string): boolean {
  const seg = pathname.split('/')[1]
  return LOCALES.includes(seg as (typeof LOCALES)[number])
}

function isProtected(pathname: string): boolean {
  const stripped = pathname.replace(/^\/(en|ar)/, '') || '/'
  return PROTECTED_SEGMENTS.some((seg) => stripped.startsWith(seg))
}

// Public, locale-less paths that should NOT be rewritten.
const PUBLIC_PATHS = ['/verify/']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public no-locale routes pass through.
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Locale rewrite — paths without /en or /ar get redirected to the default.
  if (!hasLocalePrefix(pathname)) {
    const url = req.nextUrl.clone()
    url.pathname = `/${DEFAULT_LOCALE}${pathname === '/' ? '' : pathname}`
    return NextResponse.redirect(url)
  }

  // Auth guard
  if (isProtected(pathname)) {
    const hasSessionCookie =
      req.cookies.get('authjs.session-token') ?? req.cookies.get('__Secure-authjs.session-token')
    if (!hasSessionCookie) {
      const locale = pathname.split('/')[1] === 'ar' ? 'ar' : 'en'
      const url = req.nextUrl.clone()
      url.pathname = `/${locale}/sign-in`
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  // Skip Next internals + static assets + the NextAuth API route.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
