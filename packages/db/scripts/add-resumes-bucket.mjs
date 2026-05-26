// One-shot: create the 'resumes' public Supabase Storage bucket used
// by the careers/apply flow.
//
// We talk to the Supabase Storage REST API directly with the service
// role key — no need for the @supabase/supabase-js SDK at this layer.
// The bucket is set to public so resume URLs returned to companies
// are simple non-signed URLs (good UX: company HR clicks and opens).
// If we ever need view-tracking or expiring links, flip the bucket
// private and switch to signed URLs.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env')
  process.exit(1)
}

const BUCKET = 'resumes'

const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${SERVICE_ROLE}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    id: BUCKET,
    name: BUCKET,
    public: true,
    // PDFs only at MVP — extend the allowed list if we later accept
    // docx, odt, etc. 10MB cap should cover any reasonable resume.
    allowed_mime_types: ['application/pdf'],
    file_size_limit: 10 * 1024 * 1024,
  }),
})

const body = await res.text()
if (res.ok) {
  console.log(`✓ Created bucket '${BUCKET}' (public, PDF only, 10MB limit)`)
} else if (res.status === 409 || /already exists/i.test(body)) {
  console.log(`· Bucket '${BUCKET}' already exists — leaving as-is`)
} else {
  console.error(`✗ Bucket creation failed (HTTP ${res.status}):`, body)
  process.exit(1)
}
