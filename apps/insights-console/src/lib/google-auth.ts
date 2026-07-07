import 'server-only'
import { GoogleAuth, type JWT } from 'google-auth-library'
import { loadEnv } from '@sa/config'

/**
 * Cached JWT client for the read-only GA4 + GSC APIs. Mirrors the same
 * SA (blog-insights-reader@…) we set up on apps/api — this app just
 * reads directly from the Google APIs instead of going through
 * /blog/insights/refresh so pages can render fresh data on demand.
 */

let cached: JWT | null = null
let cachedAt = 0
const CLIENT_MAX_AGE_MS = 60 * 60 * 1000

const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
]

export async function getAuthClient(): Promise<JWT | null> {
  const env = loadEnv()
  const raw = env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!raw) return null
  if (cached && Date.now() - cachedAt < CLIENT_MAX_AGE_MS) return cached

  let key: { client_email?: string; private_key?: string }
  try {
    key = JSON.parse(raw)
  } catch (err) {
    console.error('[insights-console/auth] invalid JSON', {
      err: (err as Error).message,
    })
    return null
  }
  if (!key.client_email || !key.private_key) return null

  const auth = new GoogleAuth({
    credentials: {
      client_email: key.client_email,
      private_key: key.private_key.replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
  })
  const client = (await auth.getClient()) as JWT
  cached = client
  cachedAt = Date.now()
  return client
}
