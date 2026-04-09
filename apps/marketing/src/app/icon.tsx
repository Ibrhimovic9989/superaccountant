import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

/**
 * Favicon — generated from JSX via @vercel/og.
 * The "SA" mark on a black tile, matching the brand mark in the nav.
 */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: '#fafafa',
        fontSize: 16,
        fontWeight: 800,
        letterSpacing: -0.5,
        borderRadius: 6,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      SA
    </div>,
    { ...size },
  )
}
