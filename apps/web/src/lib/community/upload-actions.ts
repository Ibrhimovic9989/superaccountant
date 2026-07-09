'use server'

import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

/**
 * Signed-upload flow for community post images.
 *
 * The client uploads DIRECTLY to Supabase Storage — the server just
 * mints a short-lived signed URL and returns it. That saves the
 * ~500 KB → 5 MB round-trip through the Vercel serverless function
 * (which is both slow and expensive on Fluid Compute per-request).
 *
 * Storage layout:
 *   community-media/{userId}/{cuid}.{ext}
 *
 * Namespacing by userId prevents one student from clobbering another's
 * asset even in the (unlikely) event of a cuid collision, and makes
 * moderation cleanup trivial ("delete everything under this user").
 *
 * Bucket policy: `community-media` is public-read, 5 MB file-size
 * cap, mime-type allowlist limited to jpeg/png/webp/gif. Set at the
 * DB level so a compromised service key still can't upload a PDF or
 * 100 MB video.
 */

const BUCKET = 'community-media'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB — matches the bucket policy

// Allowlist + extension we'll write to disk. Kept as a small map so
// the client and server agree on the exact ext for a given mime.
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

const SignSchema = z.object({
  contentType: z.string().min(3).max(60),
  size: z.number().int().positive(),
})

export type SignedUploadResult =
  | { ok: true; uploadUrl: string; token: string; publicUrl: string; path: string }
  | { ok: false; error: string }

export async function signCommunityUploadAction(raw: unknown): Promise<SignedUploadResult> {
  const parsed = SignSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'Invalid payload' }
  const { contentType, size } = parsed.data

  const ext = ALLOWED[contentType]
  if (!ext) {
    return { ok: false, error: 'Only JPG / PNG / WebP / GIF images are supported.' }
  }
  if (size > MAX_BYTES) {
    return { ok: false, error: `File is larger than the 5 MB limit (${(size / 1024 / 1024).toFixed(1)} MB).` }
  }

  const session = await auth()
  if (!session?.user?.id) redirect('/en/sign-in')
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return { ok: false, error: 'Storage is not configured on the server.' }
  }

  const cuid = randomUUID().replace(/-/g, '').slice(0, 20)
  const path = `${session.user.id}/${cuid}.${ext}`

  // Supabase Storage: mint a signed upload token so the client can
  // PUT directly. Docs: /storage/v1/object/upload/sign/{bucket}/{path}
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${path}`,
    {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
    },
  )
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[community-upload] sign failed', { status: res.status, body: body.slice(0, 200) })
    return { ok: false, error: 'Could not prepare upload right now.' }
  }
  // Supabase returns { url, token } — url is the RELATIVE path we
  // append to SUPABASE_URL. We compose the absolute URL here so the
  // client can PUT to it with a single fetch.
  const data = (await res.json()) as { url?: string; token?: string }
  if (!data.url || !data.token) {
    return { ok: false, error: 'Signed URL response missing fields.' }
  }
  const uploadUrl = data.url.startsWith('http')
    ? data.url
    : `${SUPABASE_URL}${data.url}`
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`

  return { ok: true, uploadUrl, token: data.token, publicUrl, path }
}
