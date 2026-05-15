import * as React from 'react'

/**
 * Subtle, fixed-position page backdrop. Sits behind all content with
 * `pointer-events-none` so it never blocks interaction. Two layers:
 *
 *  1. **Color blobs** — three radial gradients in violet / cyan / pink,
 *     anchored off-edge and heavily blurred.
 *  2. **Dot grid** — an SVG pattern repeated across the page.
 *
 * Opacity is driven by `--backdrop-blob-opacity` / `--backdrop-dots-opacity`
 * CSS variables (declared in globals.css). Light mode raises both so the
 * blobs cut through near-white bg; dark mode lowers them so the
 * atmosphere stays subtle. The variable swap fires automatically when
 * the user toggles theme — no JS, no Tailwind dark-mode plumbing.
 *
 * Non-interactive, aria-hidden. Keep it `fixed inset-0`.
 */
export function PageBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(closest-side, #a78bfa, transparent)',
          opacity: 'var(--backdrop-blob-opacity)',
        }}
      />
      <div
        className="absolute -right-32 top-1/4 h-[480px] w-[480px] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(closest-side, #22d3ee, transparent)',
          opacity: 'var(--backdrop-blob-opacity)',
        }}
      />
      <div
        className="absolute -bottom-32 left-1/3 h-[460px] w-[460px] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(closest-side, #f472b6, transparent)',
          opacity: 'var(--backdrop-blob-opacity)',
        }}
      />

      <svg
        className="absolute inset-0 h-full w-full text-fg-subtle"
        style={{ opacity: 'var(--backdrop-dots-opacity)' }}
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
