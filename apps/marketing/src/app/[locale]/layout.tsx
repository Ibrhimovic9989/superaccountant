import { LOCALES, type SupportedLocale, dirFor } from '@sa/i18n'
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import '../globals.css'

const SITE_URL = process.env.NEXT_PUBLIC_MARKETING_URL ?? 'https://www.superaccountant.in'

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

const TITLE = 'SuperAccountant — AI tutor for accountants'
const DESCRIPTION =
  'Adaptive lessons, daily practice, and an AI tutor that knows the curriculum. Built for accountants in India and Saudi Arabia.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s · SuperAccountant',
  },
  description: DESCRIPTION,
  applicationName: 'SuperAccountant',
  keywords: [
    'accounting tutor',
    'AI tutor',
    'CA exam',
    'SOCPA',
    'GST',
    'ZATCA',
    'IFRS',
    'India accounting',
    'Saudi accounting',
    'bilingual learning',
  ],
  authors: [{ name: 'SuperAccountant Technologies' }],
  creator: 'SuperAccountant Technologies',
  publisher: 'SuperAccountant Technologies',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'SuperAccountant',
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
    alternateLocale: ['ar_SA'],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

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
      <body className="overflow-x-hidden">{children}</body>
    </html>
  )
}
