import type { MetadataRoute } from 'next'

/**
 * Robots policy for app.superaccountant.in. We default-deny anything
 * that's gated (dashboard, lessons, admin, profile, the in-app
 * journey) and explicitly allow the public marketing + product
 * surfaces. The sitemap link tells crawlers where the canonical set
 * of URLs lives.
 */

// Strip trailing SLASHES *and* WHITESPACE. A production incident on
// the marketing app traced back to a Vercel env var with a literal
// newline at the end — the old `/\/$/` regex only handled slashes,
// so `robots.txt` shipped a broken `Sitemap: https://app…\n/sitemap.xml`
// line that Google could not parse. Same trap here.
const SITE_URL = (process.env.NEXTAUTH_URL ?? 'https://app.superaccountant.in').replace(
  /[\s/]+$/,
  '',
)

// Anything under these path tails is gated. We list them twice
// (without and with the locale prefix) so the rules match whether the
// crawler lands on `/dashboard` or `/en/dashboard`.
const GATED_TAILS = [
  '/admin/',
  '/dashboard',
  '/lessons/',
  '/profile',
  '/welcome',
  '/grand-test',
  '/pay-balance',
  '/assignments',
  '/practice-lab',
  '/roadmap',
  '/search',
  '/guides',
  '/songs',
  '/certificate',
  '/certificates',
  '/sign-in',
  '/verify-request',
  '/auth-error',
]

function buildDisallow(): string[] {
  // Locale-prefixed (e.g. `/en/dashboard`) + bare (`/dashboard`) for
  // crawlers that hit the canonical without the locale.
  const out: string[] = ['/api/']
  for (const tail of GATED_TAILS) {
    out.push(tail)
    out.push(`/en${tail}`)
    out.push(`/ar${tail}`)
  }
  return out
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: buildDisallow(),
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
