// One-shot: add mediaBlurhash column to CommunityPost.
//
// Blurhash is a tiny (~30 char) string that decodes into a blurred
// preview of an image. The client renders the preview instantly on a
// canvas while the real image downloads, then swaps. That's the
// Instagram-feel — content on screen in <100ms, no blank rectangles.
//
// Generated client-side in ImageUploader before the file is uploaded
// (the browser already has the pixel data — no need to round-trip).
// Persisted alongside mediaUrl and served on every feed query.
//
// Only applies to image posts. Videos already render their first
// frame via `<video preload="metadata" src="...#t=0.1">`, which gives
// the same "something is here" effect for free.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
const { PrismaClient } = await import('@prisma/client')
const p = new PrismaClient()

await p.$executeRawUnsafe(`
  ALTER TABLE "CommunityPost"
  ADD COLUMN IF NOT EXISTS "mediaBlurhash" TEXT
`)

console.log('CommunityPost.mediaBlurhash column ready')
await p.$disconnect()
