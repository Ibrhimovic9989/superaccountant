/**
 * Resume upload to the public 'resumes' Supabase Storage bucket.
 * Uses the Storage REST API directly with the service-role key so we
 * don't have to pull in @supabase/supabase-js as a dependency.
 *
 * Server-side only — calls live in server actions / API routes.
 *
 * On success returns the public URL the candidate's resume is hosted
 * at; that URL is what we persist on JobApplication.resumeUrl.
 */

const BUCKET = 'resumes'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

export type UploadResult = { url: string; path: string }

/**
 * Upload a resume Blob/File for `userId`. Stores at
 *   {bucket}/{userId}/{nanoid}.pdf
 * — namespaced by user so a single bad actor can't pollute another
 * user's resume namespace.
 *
 * Throws on any non-2xx Supabase response. Caller is responsible for
 * authenticating the user before invoking.
 */
export async function uploadResumePdf(args: {
  userId: string
  file: Blob | File
  originalFilename?: string | null
}): Promise<UploadResult> {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error('[resumes] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
  }

  // Reject non-PDFs at the boundary — the bucket's mime allowlist will
  // reject them too, but failing here gives a friendlier error.
  const reportedType =
    'type' in args.file && typeof (args.file as Blob).type === 'string'
      ? (args.file as Blob).type
      : ''
  if (reportedType && reportedType !== 'application/pdf') {
    throw new Error('[resumes] only PDF resumes are accepted')
  }
  if (args.file.size > 10 * 1024 * 1024) {
    throw new Error('[resumes] resume exceeds 10MB limit')
  }

  const filename = `${randomToken()}.pdf`
  const path = `${args.userId}/${filename}`

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(path)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/pdf',
        'x-upsert': 'false',
      },
      body: args.file,
    },
  )
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`[resumes] upload failed (HTTP ${res.status}): ${text.slice(0, 200)}`)
  }

  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
  return { url, path }
}

function randomToken(): string {
  // 8 random bytes, base36 — short enough for URLs, long enough that
  // collisions inside a single user's namespace are improbable.
  const arr = new Uint8Array(8)
  crypto.getRandomValues(arr)
  let n = 0n
  for (const b of arr) n = (n << 8n) | BigInt(b)
  return n.toString(36)
}
