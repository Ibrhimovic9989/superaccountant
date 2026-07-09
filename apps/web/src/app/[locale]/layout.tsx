import { LOCALES, type SupportedLocale, dirFor } from '@sa/i18n'
import type { Metadata } from 'next'
import { Bricolage_Grotesque, Instrument_Serif, Inter, JetBrains_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import Script from 'next/script'
import '../globals.css'

// Same GA property as the marketing site — GA4 stitches subdomain
// sessions together automatically, so the app-side funnel lands in the
// same reports as the /pricing → /apply flow.
const GA_MEASUREMENT_ID = 'G-7Y8NMLPKJH'

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

// Display font for the community surface (neobrutal aesthetic).
// Only loaded on pages that use it via var(--font-display).
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['600', '700', '800'],
  display: 'swap',
})

const serif = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: '400',
  style: ['normal', 'italic'],
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
  // Default to noindex — every public page opts back in via its own
  // `metadata.robots`. The list of gated tails is also enforced by
  // robots.ts. This is the safety net.
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

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SuperAccountant',
    alternateName: 'Superaccountant',
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    description:
      'Bilingual (English / Arabic) AI tutor for accountants. India + KSA tracks covering GST, TDS, ZATCA, VAT, Zakat, IFRS, and Ind AS.',
    sameAs: [],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'info@superaccountant.in',
        availableLanguage: ['English', 'Arabic', 'Hindi'],
      },
    ],
  }

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${inter.variable} ${mono.variable} ${display.variable} ${serif.variable}`}
    >
      <body className="overflow-x-hidden">
        {children}
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered, static JSON-LD
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
        </Script>
      </body>
    </html>
  )
}
