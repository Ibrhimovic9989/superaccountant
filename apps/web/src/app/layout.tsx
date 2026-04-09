import type { ReactNode } from 'react'

/**
 * Root layout — pass-through. The locale segment owns <html>/<body>/<head>
 * because it knows the locale and can set lang + dir per request. The public
 * /verify/[hash] route renders its own <html> too (no locale prefix).
 *
 * This file MUST exist for Next App Router but stays minimal.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
