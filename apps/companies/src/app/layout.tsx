import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

const GA_MEASUREMENT_ID = 'G-7Y8NMLPKJH'

export const metadata: Metadata = {
  title: 'SuperAccountant for Employers',
  description: 'Hire job-ready accountants. Post roles, review cohort-graduate applicants.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
