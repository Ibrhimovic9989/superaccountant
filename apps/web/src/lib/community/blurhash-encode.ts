'use client'

import { encode } from 'blurhash'

/**
 * Encode a File (image) into a compact blurhash string.
 *
 * Runs entirely in the browser — we already have the file in memory,
 * so there's no reason to round-trip through the server just to get
 * a 30-byte string. We draw the image tiny (32×32 max) before
 * encoding because blurhash cost scales with pixel count and we lose
 * nothing at that resolution (the whole point is that the output is
 * blurred anyway).
 *
 * Returns null on any failure (unsupported browser, decode error) —
 * the post will still be created, we just skip the placeholder.
 *
 * Skips videos — first-frame extraction is an order of magnitude
 * more code and `<video preload="metadata">` already renders the
 * first frame as a poster on the tile.
 */
export async function encodeBlurhashFromFile(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null
  try {
    const bitmap = await createImageBitmap(file)
    const MAX = 32
    const scale = Math.min(MAX / bitmap.width, MAX / bitmap.height, 1)
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, w, h)
    const { data } = ctx.getImageData(0, 0, w, h)
    // 4×3 components is the sweet spot: ~28-char hash, decent detail.
    return encode(data, w, h, 4, 3)
  } catch {
    return null
  }
}
