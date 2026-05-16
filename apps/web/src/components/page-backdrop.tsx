import * as React from 'react'

/**
 * Fixed page backdrop — futuristic telemetry vibe.
 *
 * Two layers, both `pointer-events-none` and `aria-hidden`:
 *
 *  1. **Grid** — fine 1px lines on a 48px cell, fading out toward the
 *     edges via a radial mask so the page never feels boxed in. Inherits
 *     text-fg-subtle so it stays low-contrast in both modes.
 *
 *  2. **Aurora** — two thin accent gradients in violet + cyan, anchored
 *     off-edge and blurred. Far smaller and lower-opacity than the
 *     previous multi-blob backdrop so it reads as a faint atmosphere,
 *     not decoration.
 *
 * Opacity is theme-aware via the CSS variables declared in globals.css:
 * `--backdrop-blob-opacity` + `--backdrop-dots-opacity`. Light mode
 * raises them so the grid still reads on near-white bg.
 */
export function PageBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Aurora — two soft slim accent gradients */}
      <div
        className="absolute -left-40 top-[-15%] h-[520px] w-[520px] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(closest-side, #a78bfa, transparent 70%)',
          opacity: 'var(--backdrop-blob-opacity)',
        }}
      />
      <div
        className="absolute -right-40 top-[35%] h-[520px] w-[520px] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(closest-side, #22d3ee, transparent 70%)',
          opacity: 'var(--backdrop-blob-opacity)',
        }}
      />

      {/* Grid — 48px cell, radial mask fade */}
      <svg
        className="absolute inset-0 h-full w-full text-fg-subtle [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black,transparent_100%)]"
        style={{ opacity: 'var(--backdrop-dots-opacity)' }}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <title>Grid backdrop</title>
        <defs>
          <pattern
            id="page-backdrop-grid"
            x="0"
            y="0"
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#page-backdrop-grid)" />
      </svg>
    </div>
  )
}
