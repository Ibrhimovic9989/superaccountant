import { LOCALES, type SupportedLocale } from '@sa/i18n'
import type { Metadata } from 'next'

/**
 * Build a `Metadata` object for a public page. Centralises:
 *   - `robots: { index: true, follow: true }` to opt back in from the
 *     layout's default-noindex.
 *   - `alternates.canonical` + `alternates.languages` for the EN ↔ AR
 *     hreflang pair (Google reads `alternates.languages.x-default`).
 *   - openGraph defaults (locale, type, url) so per-page calls only
 *     need to supply title/description.
 *
 * Pages call this from inside `generateMetadata` so they can use the
 * route params to pick the right locale + path.
 */

const SITE_URL = (process.env.NEXTAUTH_URL ?? 'https://app.superaccountant.in').replace(/\/$/, '')

export type PublicMetaInput = {
  locale: SupportedLocale
  /** Path with the leading slash, no locale prefix. e.g. '/cohort', '/jobs/abc'. */
  path: string
  title: string
  description: string
  /** Override the default og:image. Path is relative to SITE_URL. */
  ogImagePath?: string
  /** Optional og:type override. Defaults to 'website'. */
  ogType?: 'website' | 'article' | 'profile'
}

function ogLocaleFor(locale: SupportedLocale): string {
  return locale === 'ar' ? 'ar_SA' : 'en_US'
}

export function buildPublicMetadata(input: PublicMetaInput): Metadata {
  const { locale, path, title, description } = input
  const canonical = `${SITE_URL}/${locale}${path}`
  const languages: Record<string, string> = {}
  for (const l of LOCALES) languages[l] = `${SITE_URL}/${l}${path}`
  languages['x-default'] = `${SITE_URL}/en${path}`

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
    openGraph: {
      type: input.ogType ?? 'website',
      siteName: 'SuperAccountant',
      title,
      description,
      url: canonical,
      locale: ogLocaleFor(locale),
      alternateLocale: LOCALES.filter((l) => l !== locale).map(ogLocaleFor),
      ...(input.ogImagePath ? { images: [{ url: `${SITE_URL}${input.ogImagePath}` }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}
