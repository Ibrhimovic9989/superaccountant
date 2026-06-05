// One-shot: wire Supabase Cron (pg_cron + pg_net) to call the
// `/blog/auto-generate` endpoint twice daily for the autonomous
// SEO/GEO blog writer agent.
//
// Schedule (UTC, which is what pg_cron uses):
//   03:30 UTC → 09:00 IST  (morning India audience peak)
//   12:30 UTC → 18:00 IST  (evening India audience peak)
//
// Token plumbing: pg_net needs the bearer token in the SQL itself. We
// store it as a Postgres GUC (`app.blog_cron_token`) so it stays out
// of cron-job source. Set it once via:
//
//   ALTER DATABASE postgres SET app.blog_cron_token TO '<the same value as BLOG_CRON_TOKEN>';
//
// Hand the matching value to the API via the BLOG_CRON_TOKEN env var.
// The controller uses crypto.timingSafeEqual on it.

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

// Override target via env if you need to point cron at a staging URL.
const API_URL =
  process.env.BLOG_CRON_API_URL ?? 'https://api.superaccountant.in/blog/auto-generate'

// ── Extensions ───────────────────────────────────────────────
await p.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_cron`)
console.log('✓ pg_cron extension')
await p.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_net`)
console.log('✓ pg_net extension')

// ── Job definitions ──────────────────────────────────────────
//
// We unschedule any pre-existing job with the same name first so this
// script is idempotent. cron.unschedule throws if the job doesn't
// exist, so we guard it with a DO block.

const jobs = [
  {
    name: 'blog-auto-generate-am',
    cron: '30 3 * * *', // 09:00 IST
    note: '09:00 IST — morning India audience peak',
  },
  {
    name: 'blog-auto-generate-pm',
    cron: '30 12 * * *', // 18:00 IST
    note: '18:00 IST — evening India audience peak',
  },
]

for (const job of jobs) {
  // Drop the existing schedule if it exists.
  await p.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = '${job.name}') THEN
        PERFORM cron.unschedule('${job.name}');
      END IF;
    END$$;
  `)

  // Schedule the new one. pg_net's net.http_post emits a request and
  // returns immediately; the API's response is logged in
  // net._http_response. Use a single-line SQL body so escape rules
  // stay sane.
  const sqlBody = [
    "SELECT net.http_post(",
    `  url := '${API_URL}',`,
    "  headers := jsonb_build_object(",
    "    'Authorization', 'Bearer ' || current_setting('app.blog_cron_token'),",
    "    'Content-Type', 'application/json'",
    "  ),",
    "  body := '{}'::jsonb",
    ");",
  ].join('\n')

  await p.$executeRawUnsafe(`
    SELECT cron.schedule(
      '${job.name}',
      '${job.cron}',
      $$
        ${sqlBody}
      $$
    );
  `)
  console.log(`✓ scheduled ${job.name} @ '${job.cron}' UTC — ${job.note}`)
}

console.log('\nNext steps:')
console.log("  1. Set the bearer token in Postgres (run once in the Supabase SQL editor):")
console.log("       ALTER DATABASE postgres SET app.blog_cron_token TO '<your token>';")
console.log('  2. Set the same value as BLOG_CRON_TOKEN in the API\'s env (Vercel + .env).')
console.log('  3. Verify with: SELECT jobname, schedule, active FROM cron.job;')
console.log('  4. Tail responses with: SELECT * FROM net._http_response ORDER BY id DESC LIMIT 10;')

await p.$disconnect()
