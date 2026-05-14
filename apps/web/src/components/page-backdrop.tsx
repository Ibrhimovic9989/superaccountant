import * as React from 'react'

/**
 * Subtle, fixed-position page backdrop. Sits behind all content with
 * `pointer-events-none` so it never blocks interaction. Two layers:
 *
 *  1. **Color blobs** — three very-low-opacity radial gradients in
 *     violet / cyan / pink, anchored to corners and heavily blurred.
 *     This is what gives the LMS its cheerful tint without overwhelming
 *     focus (each blob caps out around 8% opacity).
 *
 *  2. **Dot grid** — an SVG pattern repeated across the page at ~10%
 *     opacity. Pure CSS / SVG so it costs nothing at runtime.
 *
 * The backdrop is non-interactive and `aria-hidden`. Don't add anything
 * here that needs to scroll with the page — keep it `fixed inset-0`.
 */
export function PageBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Soft colour blobs — placed off-screen-edges so the heavy blur
          tapers into the page edges, never blocks centre content. */}
      <div
        className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full opacity-[0.08] blur-3xl"
        style={{ background: 'radial-gradient(closest-side, #a78bfa, transparent)' }}
      />
      <div
        className="absolute -right-32 top-1/4 h-[480px] w-[480px] rounded-full opacity-[0.07] blur-3xl"
        style={{ background: 'radial-gradient(closest-side, #22d3ee, transparent)' }}
      />
      <div
        className="absolute -bottom-32 left-1/3 h-[460px] w-[460px] rounded-full opacity-[0.07] blur-3xl"
        style={{ background: 'radial-gradient(closest-side, #f472b6, transparent)' }}
      />

      {/* Dot grid — currentColor inherits text-fg-subtle/15 from the wrapper. */}
      <svg
        className="absolute inset-0 h-full w-full text-fg-subtle/[0.09]"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <title>Background pattern</title>
        <defs>
          <pattern
            id="page-backdrop-dots"
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="1" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#page-backdrop-dots)" />
      </svg>
    </div>
  )
}
