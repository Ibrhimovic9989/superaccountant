import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'SuperAccountant — Accounting careers, GST, ZATCA, and more',
  description:
    'Hands-on guides for B.Com students, recent commerce graduates, and working accountants. India + KSA tracks.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BLOG_URL ?? 'https://blog.superaccountant.in'),
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.superaccountant.in'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}

function SiteHeader() {
  return (
    <header className="border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-headline text-lg font-semibold tracking-tight">
          SuperAccountant
          <span className="ms-1 font-sans text-xs font-normal text-fg-muted">Journal</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/" className="text-fg-muted hover:text-fg">
            Latest
          </Link>
          <a
            href={`${APP_URL}/quiz`}
            className="text-fg-muted hover:text-fg"
            rel="noreferrer"
          >
            Take the quiz
          </a>
          <a
            href={`${APP_URL}/cohort`}
            className="inline-flex items-center rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            Join cohort
          </a>
        </nav>
      </div>
    </header>
  )
}

function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-bg-soft">
      <div className="mx-auto max-w-5xl px-6 py-10 text-sm text-fg-muted">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} SuperAccountant. All rights reserved.</p>
          <p>
            <a href={APP_URL} className="hover:text-fg" rel="noreferrer">
              Main app
            </a>
            <span className="mx-2">·</span>
            <a href={`${APP_URL}/cohort`} className="hover:text-fg" rel="noreferrer">
              Cohort
            </a>
            <span className="mx-2">·</span>
            <a href={`${APP_URL}/quiz`} className="hover:text-fg" rel="noreferrer">
              Quiz
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
