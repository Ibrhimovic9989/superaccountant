import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { BlogNav } from '@/components/blog-nav'
import { BlogFooter } from '@/components/blog-footer'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.superaccountant.in'
const SITE_URL = process.env.NEXT_PUBLIC_BLOG_URL ?? 'https://blog.superaccountant.in'

const TITLE = 'SuperAccountant Journal — GST, ZATCA, accounting careers'
const DESCRIPTION =
  'Practitioner-grade guides for B.Com students, recent commerce graduates, and working accountants. India + KSA tracks.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s · SuperAccountant Journal' },
  description: DESCRIPTION,
  applicationName: 'SuperAccountant',
  authors: [{ name: 'SuperAccountant Technologies' }],
  openGraph: {
    type: 'website',
    siteName: 'SuperAccountant Journal',
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <body className="overflow-x-hidden">
        <div className="mx-auto max-w-6xl">
          <BlogNav appUrl={APP_URL} />
        </div>
        {children}
        <BlogFooter appUrl={APP_URL} />
      </body>
    </html>
  )
}
