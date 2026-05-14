import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'SuperAccountant — the agentic accounting tutor'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Default Open Graph image for the marketing site.
 * Generated at request time via @vercel/og — no external assets, pure JSX → PNG.
 */
export default async function OG() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        background: '#0a0a0a',
        color: '#fafafa',
        fontFamily: 'Inter, system-ui, sans-serif',
        position: 'relative',
      }}
    >
      {/* Subtle grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Brand row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, zIndex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 12,
            background: '#fafafa',
            color: '#0a0a0a',
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: -1,
          }}
        >
          SA
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: -0.5,
          }}
        >
          SuperAccountant
        </div>
      </div>

      {/* Hero copy */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, zIndex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.04)',
            fontSize: 16,
            color: 'rgba(250,250,250,0.7)',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            alignSelf: 'flex-start',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 999, background: '#a78bfa' }} />
          Beta · India + KSA
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 600,
            lineHeight: 1.02,
            letterSpacing: -3,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span>The agentic</span>
          <span style={{ color: '#a78bfa' }}>accounting tutor.</span>
        </div>
        <div
          style={{
            fontSize: 28,
            color: 'rgba(250,250,250,0.6)',
            maxWidth: 900,
            lineHeight: 1.4,
          }}
        >
          Adaptive lessons, daily practice, and an AI tutor that knows the curriculum — bilingual EN
          + AR.
        </div>
      </div>

      {/* Footer pills */}
      <div style={{ display: 'flex', gap: 12, zIndex: 1 }}>
        {['🇮🇳 Chartered Path', "🇸🇦 Mu'tamad Path", 'EN · AR', 'ZATCA · GST · IFRS'].map((label) => (
          <div
            key={label}
            style={{
              padding: '8px 16px',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              fontSize: 18,
              color: 'rgba(250,250,250,0.8)',
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>,
    { ...size },
  )
}
