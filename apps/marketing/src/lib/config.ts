/**
 * Public marketing config. Resolved at build time via Next env vars.
 *
 * NEXT_PUBLIC_APP_URL is the URL of the actual app (apps/web). Marketing
 * CTAs link there for sign-in / sign-up. In dev: http://localhost:3000.
 * In prod: https://app.superaccountant.in (or similar).
 */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export function appLink(locale: 'en' | 'ar', path = '/sign-in'): string {
  return `${APP_URL}/${locale}${path.startsWith('/') ? path : `/${path}`}`
}
