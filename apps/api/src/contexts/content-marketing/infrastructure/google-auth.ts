/**
 * Shared Google service-account authenticator for the GA4 + GSC clients.
 *
 * We call the REST endpoints directly (avoids pulling the 100 MB
 * `googleapis` SDK into a Vercel Serverless bundle) and get an access
 * token via google-auth-library's JWT client. Tokens are cached in
 * memory for their lifetime (typically 1h) so N calls in a single cron
 * pay one auth round-trip.
 *
 * On misconfiguration (missing env, malformed JSON) `getAuthClient()`
 * returns null so the caller can no-op gracefully instead of throwing.
 * The service is optional — the daily blog cron must still run when
 * GA/GSC are unreachable.
 */

import { GoogleAuth, JWT } from 'google-auth-library'
import { loadEnv } from '@sa/config'

let cached: JWT | null = null
let cachedAt = 0
// Re-parse the SA key hourly so a hot-swapped env var picks up without
// a container restart. Tokens have their own refresh cadence handled by
// google-auth-library.
const CLIENT_MAX_AGE_MS = 60 * 60 * 1000

const SCOPES = [
  // GA4 Data API — read-only.
  'https://www.googleapis.com/auth/analytics.readonly',
  // GSC Search Analytics — read-only.
  'https://www.googleapis.com/auth/webmasters.readonly',
]

/**
 * Returns a fresh JWT client, or `null` if the env is not configured.
 * Callers should treat null as "insights disabled, skip".
 */
// Populated on every miss so callers (currently the debug leak in
// search-console.client.ts) can surface a specific reason for the null.
export let lastAuthFailReason: string | null = null

export async function getAuthClient(): Promise<JWT | null> {
  const env = loadEnv()
  const raw = env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!raw) {
    lastAuthFailReason = 'env-missing'
    return null
  }

  if (cached && Date.now() - cachedAt < CLIENT_MAX_AGE_MS) return cached

  let key: { client_email?: string; private_key?: string }
  try {
    key = JSON.parse(raw)
  } catch (err) {
    console.error('[google-auth] GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON', {
      err: (err as Error).message,
    })
    lastAuthFailReason = `json-parse: ${(err as Error).message.slice(0, 80)} · rawLen=${raw.length} · first=${JSON.stringify(raw.slice(0, 40))}`
    return null
  }
  if (!key.client_email || !key.private_key) {
    console.error('[google-auth] JSON missing client_email or private_key')
    lastAuthFailReason = `json-shape · hasEmail=${!!key.client_email} · hasPk=${!!key.private_key} · keys=${Object.keys(key).join(',')}`
    return null
  }

  try {
    const auth = new GoogleAuth({
      credentials: {
        client_email: key.client_email,
        // GoogleAuth expects real newlines in the PEM. The env-var round-
        // trip through Vercel keeps them intact, but a manual copy-paste
        // sometimes lands "\n" literals; normalise defensively.
        private_key: key.private_key.replace(/\\n/g, '\n'),
      },
      scopes: SCOPES,
    })
    const client = (await auth.getClient()) as JWT
    cached = client
    cachedAt = Date.now()
    lastAuthFailReason = null
    return client
  } catch (err) {
    lastAuthFailReason = `getClient-throw: ${(err as Error).message.slice(0, 200)}`
    return null
  }
}
