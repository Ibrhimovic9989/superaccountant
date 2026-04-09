import type { ReactNode } from 'react'

/**
 * Root layout — pass-through. The locale segment owns <html>/<body>/<head>
 * because it knows the locale and can set lang + dir per request.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
