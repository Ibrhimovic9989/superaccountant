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
  // Every route matched by middleware is un-cacheable on Vercel —
  // the response ships `Cache-Control: no-store` no matter what the
  // middleware body actually does. That was silently killing SEO on
  // every public route on the app subdomain (GSC audit 2026-07-14).
  //
  // We narrow the matcher to only the routes that actually need
  // middleware processing:
  //   1. Bare / no-locale paths — need locale rewrite.
  //   2. Locale-prefixed protected segments (`/en/dashboard`,
  //      `/ar/lessons/…`, …) — need the auth guard.
  //
  // Everything else (public community pages, tag pages, profiles,
  // reels, /en/pricing, /en/terms, and so on) bypasses middleware
  // entirely and stays cacheable by the CDN.
  matcher: [
    // Bare paths without locale prefix — locale rewrite runs here.
    // Non-capturing `(?:…)` groups only — Next's matcher parser
    // rejects capturing groups.
    '/((?!en(?:/|$)|ar(?:/|$)|api|_next|_vercel|.*\\..*).*)',
    // Locale-prefixed protected segments — auth guard runs here.
    '/:locale(en|ar)/:seg(dashboard|tutor|assignments|grand-test|certificate|lessons)/:path*',
    '/:locale(en|ar)/:seg(dashboard|tutor|assignments|grand-test|certificate|lessons)',
  ],
}
