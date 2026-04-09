/**
 * Tiny translation helper for server components.
 *
 * The next-intl Next.js plugin doesn't play well with Next 16 + Turbopack
 * (the webpack alias it sets up isn't honoured). We bypass it on the server
 * side: load the message JSON directly and look up dotted keys.
 *
 * Client components keep using `useTranslations` from next-intl, which works
 * because NextIntlClientProvider in the layout passes messages explicitly.
 */

import type { SupportedLocale } from '@sa/i18n'
import en from '../../../messages/en.json'
import ar from '../../../messages/ar.json'

const MESSAGES: Record<SupportedLocale, Record<string, unknown>> = { en, ar }

/** Lookup a dotted key in the locale's messages, e.g. `auth.signIn.title`. */
export function t(locale: SupportedLocale, key: string): string {
  const parts = key.split('.')
  let cur: unknown = MESSAGES[locale]
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) {
      cur = (cur as Record<string, unknown>)[p]
    } else {
      return key
    }
  }
  return typeof cur === 'string' ? cur : key
}

/** Curried form: `const tt = scope(locale); tt('auth.signIn.title')` */
export function scope(locale: SupportedLocale): (key: string) => string {
  return (key) => t(locale, key)
}
