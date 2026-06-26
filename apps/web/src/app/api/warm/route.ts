/**
 * Keep-warm endpoint hit by Supabase cron every 2 minutes.
 *
 * Vercel's Fluid Compute keeps a function warm for a few minutes after
 * the last invocation. A 2-min ping holds the Node lambda + Prisma
 * connection open so real student page loads don't pay the 1–3s cold
 * start (lambda spin-up + Prisma client init + first Mumbai→Seoul
 * pool handshake). One tiny `SELECT 1` keeps the pool primed too.
 *
 * Public, unauthenticated, and explicitly opted out of Next caching
 * (otherwise the response itself would be served from CDN and the
 * underlying lambda would never warm).
 */
import { prisma } from '@sa/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  await prisma.$queryRaw`SELECT 1`
  return Response.json({ ok: true, at: new Date().toISOString() })
}
