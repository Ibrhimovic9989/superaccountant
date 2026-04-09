import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { LOCALES, dirFor, type SupportedLocale } from '@sa/i18n'
import '../globals.css'

const SITE_URL = process.env.NEXTAUTH_URL ?? 'https://app.superaccountant.in'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'SuperAccountant',
    template: '%s · SuperAccountant',
  },
  description: 'AI tutor for accountants — India and KSA',
  applicationName: 'SuperAccountant',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'SuperAccountant',
    title: 'SuperAccountant',
    description: 'AI tutor for accountants — India and KSA',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SuperAccountant',
    description: 'AI tutor for accountants — India and KSA',
  },
  // The app surfaces are gated behind auth — keep them out of search indexes.
  robots: { index: false, follow: false },
}

/**
 * Locale-aware <html> shell. Owns lang + dir, fonts, and imports the global
 * Tailwind stylesheet. Each locale segment renders this — public no-locale
 * routes (e.g. /verify/[hash]) render their own <html>.
 *
 * Theme handling: globals.css uses `@media (prefers-color-scheme: dark)` for
 * the initial paint, and `[data-theme='dark']` / `[data-theme='light']` for
 * the manual override set by `<ThemeToggle>`. No bootstrap script needed —
 * Next 16 disallows raw <script> tags inside React component trees.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!LOCALES.includes(locale as SupportedLocale)) notFound()
  const dir = dirFor(locale as SupportedLocale)

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${inter.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
