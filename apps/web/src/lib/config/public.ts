/** Public (browser-safe) config. Resolved at runtime via Next env vars. */
export const PUBLIC_CONFIG = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  marketingUrl: process.env.NEXT_PUBLIC_MARKETING_URL ?? 'http://localhost:3001',
}

/** Build a deep link into the marketing app, locale-prefixed. */
export function marketingLink(locale: 'en' | 'ar', path: string): string {
  const clean = path.startsWith('/') ? path.slice(1) : path
  return `${PUBLIC_CONFIG.marketingUrl}/${locale}${clean ? `/${clean}` : ''}`
}
