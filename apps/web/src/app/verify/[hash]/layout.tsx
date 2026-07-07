import type { ReactNode } from 'react'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'
import '../../globals.css'

const GA_MEASUREMENT_ID = 'G-7Y8NMLPKJH'

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

export const metadata = {
  title: 'Certificate verification · SuperAccountant',
  description: 'Verify a SuperAccountant certificate',
}

/**
 * Public verify layout. Lives outside the [locale] segment so anyone can
 * scan a QR and land here without auth or locale routing. Owns its own
 * <html> element so it doesn't inherit anything locale-specific.
 *
 * The lang/dir defaults to en/ltr; the page client component re-sets them
 * via document.documentElement when ?lang=ar is present (no SSR mismatch
 * because both render the same default markup first).
 */
export default function VerifyLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        {children}
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
