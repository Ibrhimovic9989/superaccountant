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
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
      bufferLogs: true,
    })
    app.enableCors({ origin: buildAllowedOriginPredicate(), credentials: true })

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

    await app.init()
  })()
  return bootPromise
}

export async function handleRequest(req: Request, res: Response): Promise<void> {
  await bootstrap()
  expressApp(req, res)
}
