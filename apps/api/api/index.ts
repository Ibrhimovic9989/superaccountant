// Vercel serverless function entry.
//
// Boots the full NestJS app once on cold start, then delegates every
// request through the cached Express adapter. Vercel auto-detects
// `apps/api/api/index.ts` as the function entry; `vercel.json` rewrites
// every path to `/api/*` so the entire route surface funnels here.
//
// Trade-offs vs. the Azure VM (apps/api/src/main.ts):
//   - Cold start ~2-3s as Nest + Prisma + Azure SDKs initialize
//   - 60s max function duration (Pro tier) — /blog/auto-generate runs
//     ~45s, so we're inside the budget but not by much
//   - No graceful shutdown (Vercel kills the worker on idle)
//   - No nginx in front — CORS + health are wired here directly

// Reads repo-root .env when running locally with `vercel dev`. On
// Vercel itself the env vars come from the dashboard.
import { readFileSync as _readFileSync } from 'node:fs'
import { resolve as _resolve } from 'node:path'

const _envPath = _resolve(process.env.SA_REPO_ROOT ?? process.cwd(), '.env')
try {
  for (const _line of _readFileSync(_envPath, 'utf8').split('\n')) {
    const _m = /^([A-Z0-9_]+)=(.*)$/.exec(_line.trim())
    if (_m && !process.env[_m[1]!]) process.env[_m[1]!] = _m[2]!.replace(/^"|"$/g, '')
  }
} catch {
  // not in a local checkout — env comes from the Vercel dashboard
}

import 'reflect-metadata'
import express from 'express'
import { NestFactory } from '@nestjs/core'
import { ExpressAdapter } from '@nestjs/platform-express'
import { loadEnv } from '@sa/config'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { AppModule } from '../src/app.module'

export const config = {
  runtime: 'nodejs',
  // /blog/auto-generate hits ~45s. Pro tier caps at 300s; 90s gives the
  // writer headroom without inviting hung-request abuse.
  maxDuration: 90,
}

const expressApp = express()
let bootPromise: Promise<void> | null = null

function buildAllowedOriginPredicate() {
  const env = loadEnv()
  const DEFAULT_ORIGINS = [
    'https://app.superaccountant.in',
    'https://superaccountant.in',
    'https://www.superaccountant.in',
    'https://blog.superaccountant.in',
    'https://companies.superaccountant.in',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3003',
  ]
  const extra = (process.env.ALLOWED_ORIGINS ?? env.NEXTAUTH_URL ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const allowed = new Set([...DEFAULT_ORIGINS, ...extra])
  return (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return cb(null, true)
    if (allowed.has(origin)) return cb(null, true)
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return cb(null, true)
    return cb(null, false)
  }
}

async function bootstrap() {
  if (bootPromise) return bootPromise
  bootPromise = (async () => {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
      bufferLogs: true,
    })
    app.enableCors({ origin: buildAllowedOriginPredicate(), credentials: true })

    // Vercel terminates TLS + forwards via x-forwarded-* headers. Trusting
    // the proxy makes the throttler use the real client IP.
    const httpAdapter = app.getHttpAdapter().getInstance() as {
      set?: (k: string, v: unknown) => void
    }
    httpAdapter.set?.('trust proxy', true)
    httpAdapter.set?.('etag', false)
    ;(
      httpAdapter as unknown as {
        get: (
          path: string,
          h: (req: unknown, res: { json: (b: unknown) => void }) => void,
        ) => void
      }
    ).get?.('/health', (_req, res) => {
      res.json({ ok: true, ts: new Date().toISOString(), service: '@sa/api', host: 'vercel' })
    })

    await app.init()
  })()
  return bootPromise
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await bootstrap()
  return expressApp(req as unknown as express.Request, res as unknown as express.Response)
}
