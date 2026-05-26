import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SuperAccountant for Employers',
  description: 'Hire job-ready accountants. Post roles, review cohort-graduate applicants.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
