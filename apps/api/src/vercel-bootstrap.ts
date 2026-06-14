// Bootstrap helper consumed by the Vercel serverless entry
// (`apps/api/api/index.js`). Splitting this out keeps the entry as
// plain JS so Vercel's @vercel/node builder doesn't try to re-validate
// the entire `src/` tree under strict tsc — which fails on patterns
// the local `nest build` is fine with (raw-SQL untyped Prisma calls,
// implicit `any` on Prisma row map callbacks, etc).
//
// Everything declared here gets compiled to `dist/vercel-bootstrap.js`
// at build time and `require()`'d by the serverless entry on cold start.

import 'reflect-metadata'
import express from 'express'
import type { Request, Response } from 'express'
import { NestFactory } from '@nestjs/core'
import { ExpressAdapter } from '@nestjs/platform-express'
import { loadEnv } from '@sa/config'
import { AppModule } from './app.module'

const expressApp = express()
let bootPromise: Promise<void> | null = null

function buildAllowedOriginPredicate(): (
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void,
) => void {
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
  return (origin, cb) => {
    if (!origin) return cb(null, true)
    if (allowed.has(origin)) return cb(null, true)
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return cb(null, true)
    return cb(null, false)
  }
}

async function bootstrap(): Promise<void> {
  if (bootPromise) return bootPromise
  bootPromise = (async () => {
    console.error('[boot] step 1: NestFactory.create starting')
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
      bufferLogs: true,
      // Surface bootstrap errors as JSON via process.stderr instead of
      // dropping them in Vercel's bufferLogs cache (which the runtime
      // discards on hard crashes).
      logger: ['error', 'warn', 'log'],
    })
    console.error('[boot] step 2: NestFactory.create done')
    app.enableCors({ origin: buildAllowedOriginPredicate(), credentials: true })
    console.error('[boot] step 3: CORS configured')

    const httpAdapter = app.getHttpAdapter().getInstance() as {
      set?: (k: string, v: unknown) => void
      get?: (
        path: string,
        h: (req: unknown, res: { json: (b: unknown) => void }) => void,
      ) => void
    }
    httpAdapter.set?.('trust proxy', true)
    httpAdapter.set?.('etag', false)
    httpAdapter.get?.('/health', (_req, res) => {
      res.json({ ok: true, ts: new Date().toISOString(), service: '@sa/api', host: 'vercel' })
    })

    console.error('[boot] step 4: app.init starting')
    await app.init()
    console.error('[boot] step 5: app.init done — booted')
  })()
  return bootPromise
}

export async function handleRequest(req: Request, res: Response): Promise<void> {
  try {
    await bootstrap()
  } catch (err) {
    console.error('[boot] bootstrap threw:', err && (err as Error).stack)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        ok: false,
        where: 'bootstrap',
        message: err && (err as Error).message ? (err as Error).message : String(err),
        stack:
          err && (err as Error).stack
            ? String((err as Error).stack).split('\n').slice(0, 14)
            : null,
      }),
    )
    return
  }
  console.error('[boot] step 6: delegating to expressApp', req.url)
  expressApp(req, res)
}
