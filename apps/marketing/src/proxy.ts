/**
 * Marketing proxy. Locale routing only — no auth, no DB.
 *
 * Bare `/` redirects to `/en`. Paths without a locale prefix get one.
 * Everything else passes through.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { LOCALES, DEFAULT_LOCALE } from '@sa/i18n'

function hasLocalePrefix(pathname: string): boolean {
  const seg = pathname.split('/')[1]
  return LOCALES.includes(seg as (typeof LOCALES)[number])
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!hasLocalePrefix(pathname)) {
    const url = req.nextUrl.clone()
    url.pathname = `/${DEFAULT_LOCALE}${pathname === '/' ? '' : pathname}`
    // 308 (permanent) rather than the default 307 (temporary) so
    // Google consolidates PageRank onto the /en URL instead of
    // splitting authority between the bare and prefixed forms.
    return NextResponse.redirect(url, 308)
  }

  return NextResponse.next()
}

export const config = {
  // Only match paths that ACTUALLY need the middleware (bare or
  // no-locale paths — everything else already has the /en or /ar
  // prefix and needs no rewrite).
  //
  // Why this matters: Vercel treats any route matched by middleware
  // as un-cacheable — the response ships `Cache-Control: no-store`
  // regardless of what the middleware body does. Before this fix
  // every marketing page (even /en/terms) was being served no-store
  // and Googlebot refused to index the domain. Excluding /en/* and
  // /ar/* from the matcher lets the CDN cache them and lets Google
  // see the intended `Cache-Control: public, max-age=…`.
  matcher: ['/((?!en(?:/|$)|ar(?:/|$)|api|_next|_vercel|.*\\..*).*)'],
}
