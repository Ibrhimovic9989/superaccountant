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
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
