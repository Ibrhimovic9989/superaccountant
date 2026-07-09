import { ImageResponse } from 'next/og'
import { prisma } from '@sa/db'

/**
 * Programmatic OG image per profile — the social share card that
 * makes a `/u/[handle]` URL land in a LinkedIn/WhatsApp preview as
 * a proper branded illustration instead of a bare link.
 *
 * Same 1200×630 pattern as the blog. Renders at request time from
 * whatever is in the profile row + counts + top achievement.
 */

export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }
export const alt = 'SuperAccountant profile card'

const TONE_GRADIENT: Record<string, string> = {
  accent: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 60%, #db2777 100%)',
  brand: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 60%, #f59e0b 100%)',
  grape: 'linear-gradient(135deg, #581c87 0%, #c026d3 60%, #ec4899 100%)',
  coral: 'linear-gradient(135deg, #831843 0%, #f43f5e 60%, #f59e0b 100%)',
  mint: 'linear-gradient(135deg, #064e3b 0%, #10b981 60%, #22d3ee 100%)',
  blush: 'linear-gradient(135deg, #831843 0%, #f472b6 60%, #f9a8d4 100%)',
  ink: 'linear-gradient(135deg, #0f172a 0%, #334155 60%, #64748b 100%)',
}

export default async function ProfileOgImage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      handle: string
      tone: string
      name: string | null
      preferredTrack: 'india' | 'ksa' | null
      certScore: number | null
      followerCount: number
      postCount: number
    }>
  >(
    `SELECT
       cp."handle",
       cp."tone",
       iu."name",
       iu."preferredTrack"::text AS "preferredTrack",
       cp."followerCount",
       cp."postCount",
       (SELECT MAX(score) FROM "CertificationCertificate" WHERE "userId" = cp."userId") AS "certScore"
     FROM "CommunityProfile" cp
     JOIN "IdentityUser" iu ON iu."id" = cp."userId"
     WHERE lower(cp."handle") = lower($1)
     LIMIT 1`,
    handle,
  )
  const row = rows[0]
  if (!row) {
    return new ImageResponse(<Fallback />, size)
  }
  const gradient = TONE_GRADIENT[row.tone] ?? TONE_GRADIENT.accent
  const trackLabel = row.preferredTrack === 'india'
    ? 'India · Chartered Path'
    : row.preferredTrack === 'ksa'
      ? "KSA · Mu'tamad Path"
      : 'SuperAccountant Community'
  const initials = (row.name || row.handle)
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        background: gradient,
        color: '#f8fafc',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          SA
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 20, fontWeight: 600 }}>SuperAccountant</span>
          <span
            style={{
              fontSize: 12,
              opacity: 0.7,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            Community
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: 40,
            background: 'rgba(255,255,255,0.18)',
            border: '4px solid rgba(255,255,255,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 72,
            fontWeight: 700,
          }}
        >
          {initials || '👤'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 62, fontWeight: 700, letterSpacing: -1.2 }}>
            {row.name || `@${row.handle}`}
          </span>
          <span style={{ fontSize: 26, opacity: 0.85 }}>@{row.handle}</span>
          <span style={{ fontSize: 22, opacity: 0.8, marginTop: 6 }}>{trackLabel}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, fontSize: 16 }}>
        <span style={{ display: 'flex', gap: 6 }}>
          <strong>{row.postCount}</strong> posts
        </span>
        <span style={{ display: 'flex', gap: 6 }}>
          <strong>{row.followerCount}</strong> followers
        </span>
        {row.certScore != null && (
          <span style={{ display: 'flex', gap: 6 }}>
            <strong>{Math.round(Number(row.certScore) * 100)}%</strong> grand-test mastery
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
      SuperAccountant Community
    </div>
  )
}
