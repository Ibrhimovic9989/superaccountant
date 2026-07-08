import { ImageResponse } from 'next/og'
import { getPublishedPostBySlug } from '@/lib/blog/store'

/**
 * Dynamic OG image per post. Next.js compiles this into a
 * `/[slug]/opengraph-image` route that renders a 1200×630 PNG on
 * request. Each post gets a unique, branded card without us
 * uploading a single file — so all 20 existing posts (which have
 * heroImageUrl = null) suddenly have a real image.
 *
 * Used three ways downstream:
 *   1. og:image + twitter:image  → social share cards
 *   2. Article JSON-LD `image`    → satisfies Rich Results
 *   3. Visible hero at the top of the post page
 *
 * Kept intentionally simple — Inter + Tailwind-ish inline styles so
 * we don't have to load a font file. next/og's built-in system font
 * covers Latin and looks clean.
 */

// Node runtime — edge would be faster but Prisma / @sa/db needs Node.
// The route is cached by Next's dynamic-route cache anyway.
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }
export const alt = 'SuperAccountant Journal article cover'

const MARKET_COPY: Record<string, { label: string; accent: string }> = {
  india: { label: 'INDIA · GST · TDS · IND AS', accent: '#f97316' },
  ksa: { label: 'KSA · ZATCA · VAT · SOCPA', accent: '#22c55e' },
  global: { label: 'ACCOUNTING JOURNAL', accent: '#a78bfa' },
}

export default async function BlogOgImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getPublishedPostBySlug(slug, 'en')
  if (!post) {
    // 404 fallback — still return a valid PNG so any accidental crawl
    // doesn't 500 in the Sitemap.
    return new ImageResponse(<Fallback />, size)
  }

  const marketKey = String(post.market ?? 'global').toLowerCase()
  const market = MARKET_COPY[marketKey] ?? MARKET_COPY.global!
  const dateLabel = (post.publishedAt ?? post.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const primaryKeyword = post.targetKeywords[0]

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        background:
          'linear-gradient(135deg, #0b0b12 0%, #14141f 40%, #1a1229 100%)',
        color: '#f8fafc',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif',
      }}
    >
      {/* Grid dot backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(167, 139, 250, 0.08) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          display: 'flex',
        }}
      />

      {/* Header row: brand + market chip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #a78bfa, #22d3ee)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 700,
              color: '#0b0b12',
            }}
          >
            SA
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.2 }}>
              SuperAccountant
            </span>
            <span style={{ fontSize: 14, color: '#94a3b8', letterSpacing: 2, textTransform: 'uppercase' }}>
              Journal
            </span>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 18px',
            borderRadius: 999,
            border: `2px solid ${market.accent}55`,
            background: `${market.accent}18`,
            color: market.accent,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: 2,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: market.accent, display: 'flex' }} />
          {market.label}
        </div>
      </div>

      {/* Title (centre column) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, zIndex: 1, maxWidth: 1040 }}>
        <h1
          style={{
            fontSize: post.titleEn.length > 80 ? 54 : 64,
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: -1.2,
            color: '#f8fafc',
            margin: 0,
            display: 'flex',
          }}
        >
          {post.titleEn}
        </h1>
        {post.subtitleEn && (
          <p
            style={{
              fontSize: 26,
              lineHeight: 1.35,
              color: '#cbd5e1',
              margin: 0,
              display: 'flex',
              maxWidth: 980,
            }}
          >
            {truncate(post.subtitleEn, 160)}
          </p>
        )}
      </div>

      {/* Footer: date + primary keyword */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1,
          fontSize: 16,
          color: '#94a3b8',
        }}
      >
        <span style={{ display: 'flex' }}>{dateLabel}</span>
        {primaryKeyword && (
          <span
            style={{
              display: 'flex',
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #334155',
              background: 'rgba(148, 163, 184, 0.08)',
              fontFamily: 'ui-monospace, monospace',
              fontSize: 13,
              maxWidth: 620,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            #{truncate(primaryKeyword, 60)}
          </span>
        )}
      </div>
    </div>,
    size,
  )
}

function Fallback() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b0b12',
        color: '#f8fafc',
        fontSize: 64,
        fontWeight: 700,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif',
      }}
    >
      SuperAccountant Journal
    </div>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}
