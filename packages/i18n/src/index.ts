export const LOCALES = ['en', 'ar'] as const
export type SupportedLocale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = 'en'

export function isRTL(locale: SupportedLocale): boolean {
  return locale === 'ar'
}

export function dirFor(locale: SupportedLocale): 'ltr' | 'rtl' {
  return isRTL(locale) ? 'rtl' : 'ltr'
}
