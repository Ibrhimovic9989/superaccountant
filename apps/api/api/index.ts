// Vercel serverless entry — mirrors the SportsPulse @superadmin-api
// pattern. TypeScript entry compiled on-the-fly by @vercel/node; the
// Nest app is booted once at module scope and cached across warm
// invocations.

import 'reflect-metadata'
import express, { type Express, type Request, type Response } from 'express'
import { NestFactory } from '@nestjs/core'
import { ExpressAdapter, type NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from '../src/app.module'

let cached: Express | null = null
let bootPromise: Promise<Express> | null = null

async function bootstrap(): Promise<Express> {
  const expressApp = express()
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(expressApp),
    { bufferLogs: true },
  )

  // CORS — production hosts plus *.vercel.app preview branches.
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
  const extra = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const allowed = new Set([...DEFAULT_ORIGINS, ...extra])
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (allowed.has(origin)) return cb(null, true)
      if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return cb(null, true)
      return cb(null, false)
    },
    credentials: true,
  })

  // Trust the Vercel proxy + skip etag.
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
  return expressApp
}

export default async function handler(req: Request, res: Response) {
  // Diagnostic probe — survives even when bootstrap throws/crashes so
  // we can confirm the lambda process is reachable.
  if ((req.url || '').startsWith('/__alive')) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        ok: true,
        nodeVersion: process.version,
        pid: process.pid,
        uptime: process.uptime(),
        bootCached: !!cached,
        bootPromiseStarted: !!bootPromise,
      }),
    )
    return
  }
  try {
    if (!cached) {
      if (!bootPromise) bootPromise = bootstrap()
      cached = await bootPromise
    }
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        ok: false,
        where: 'bootstrap',
        message: err instanceof Error ? err.message : String(err),
        stack:
          err instanceof Error && err.stack ? err.stack.split('\n').slice(0, 14) : null,
      }),
    )
    return
  }
  // @types/express v5 dropped the call signature on Express; in practice
  // the object IS callable as `(req, res) => void`.
  ;(cached as unknown as (req: Request, res: Response) => void)(req, res)
}
