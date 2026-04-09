// Supabase Edge Function — daily assignment generator.
//
// Schedule via Supabase dashboard:
//   pg_cron expression: `0 6 * * *`  (06:00 UTC, ~11:30 IST / 09:00 KSA)
//
// Calls the SuperAccountant API at SA_API_URL/assignments/generate-daily with
// the X-Cron-Secret header. The API generates assignments for every active
// student in a single call.
//
// Required Supabase secrets:
//   SA_API_URL       — e.g. https://api.superaccountant.in
//   SA_CRON_SECRET   — same value as the API's CRON_SECRET / NEXTAUTH_SECRET
//
// Deploy:
//   supabase functions deploy daily-assignments
// Schedule (one-time):
//   In the Supabase dashboard → Database → Cron → New job → call this function.

// @ts-expect-error Deno-only import
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

serve(async () => {
  // @ts-expect-error Deno globals
  const apiUrl = Deno.env.get('SA_API_URL')
  // @ts-expect-error Deno globals
  const secret = Deno.env.get('SA_CRON_SECRET')
  if (!apiUrl || !secret) {
    return new Response(JSON.stringify({ error: 'missing SA_API_URL or SA_CRON_SECRET' }), {
      status: 500,
    })
  }

  try {
    const res = await fetch(`${apiUrl}/assignments/generate-daily`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-cron-secret': secret },
      body: JSON.stringify({}),
    })
    const text = await res.text()
    return new Response(text, { status: res.status, headers: { 'content-type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 502 })
  }
})
