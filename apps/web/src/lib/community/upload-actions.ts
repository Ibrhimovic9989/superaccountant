'use server'

import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

/**
 * Signed-upload flow for community post media (images + short videos).
 *
 * The client uploads DIRECTLY to Supabase Storage — the server just
 * mints a short-lived signed URL and returns it. That saves the
 * ~500 KB → 50 MB round-trip through the Vercel serverless function
 * (which is both slow and expensive on Fluid Compute per-request).
 *
 * Storage layout:
 *   community-media/{userId}/{cuid}.{ext}
 *
 * Namespacing by userId prevents one student from clobbering another's
 * asset even in the (unlikely) event of a cuid collision, and makes
 * moderation cleanup trivial ("delete everything under this user").
 *
 * Bucket policy: `community-media` is public-read, 50 MB file-size
 * cap, mime-type allowlist limited to jpeg/png/webp/gif + mp4/webm/
 * quicktime. Set at the DB level so a compromised service key still
 * can't upload a PDF or a 500 MB video.
 *
 * The client detects whether the URL points at an image or video from
 * the extension — see `isVideoUrl()` in @/lib/community/media. Keeping
 * the "kind" derivable from the URL means we don't need a schema
 * migration to add a media_kind column.
 */

const BUCKET = 'community-media'
const IMAGE_MAX_BYTES = 5 * 1024 * 1024 // 5 MB — matches bucket policy for images
const VIDEO_MAX_BYTES = 50 * 1024 * 1024 // 50 MB — reels-length clips (~90s at ~500 kb/s)

// Allowlist + extension we'll write to disk. Kept as a small map so
// the client and server agree on the exact ext for a given mime.
const IMAGE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
const VIDEO_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

const SignSchema = z.object({
  contentType: z.string().min(3).max(60),
  size: z.number().int().positive(),
})

export type SignedUploadResult =
  | {
      ok: true
      uploadUrl: string
      token: string
      publicUrl: string
      path: string
      kind: 'image' | 'video'
    }
  | { ok: false; error: string }

export async function signCommunityUploadAction(raw: unknown): Promise<SignedUploadResult> {
  const parsed = SignSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'Invalid payload' }
  const { contentType, size } = parsed.data

  // Resolve extension + per-kind size cap in one step.
  const imageExt = IMAGE_EXT[contentType]
  const videoExt = VIDEO_EXT[contentType]
  const ext = imageExt ?? videoExt
  const kind: 'image' | 'video' | null = imageExt ? 'image' : videoExt ? 'video' : null
  if (!ext || !kind) {
    return {
      ok: false,
      error: 'Only JPG / PNG / WebP / GIF images and MP4 / WebM / MOV videos are supported.',
    }
  }
  const maxBytes = kind === 'video' ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES
  if (size > maxBytes) {
    const mb = (maxBytes / 1024 / 1024).toFixed(0)
    return {
      ok: false,
      error: `File is larger than the ${mb} MB ${kind} limit (${(size / 1024 / 1024).toFixed(1)} MB).`,
    }
  }

  const session = await auth()
  if (!session?.user?.id) redirect('/en/sign-in')
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return { ok: false, error: 'Storage is not configured on the server.' }
  }

  const cuid = randomUUID().replace(/-/g, '').slice(0, 20)
  const path = `${session.user.id}/${cuid}.${ext}`

  // Supabase Storage: mint a signed upload token so the client can
  // PUT directly. Docs: /storage/v1/object/upload/sign/{bucket}/{path}.
  // Fastify (which Supabase Storage runs on) rejects `Content-Type:
  // application/json` with an empty body, so send `{}`.
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${path}`,
    {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    },
  )
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[community-upload] sign failed', { status: res.status, body: body.slice(0, 200) })
    return { ok: false, error: 'Could not prepare upload right now.' }
  }
  // Supabase returns { url, token } — url is RELATIVE to /storage/v1
  // (e.g. "/object/upload/sign/…?token=…"). We compose the absolute
  // URL here so the client can PUT to it with a single fetch.
  const data = (await res.json()) as { url?: string; token?: string }
  if (!data.url || !data.token) {
    return { ok: false, error: 'Signed URL response missing fields.' }
  }
  const uploadUrl = data.url.startsWith('http')
    ? data.url
    : `${SUPABASE_URL}/storage/v1${data.url}`
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`

  return { ok: true, uploadUrl, token: data.token, publicUrl, path, kind }
}
