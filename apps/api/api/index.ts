// Vercel serverless entry — mirrors the SportsPulse @superadmin-api
// pattern. TypeScript entry compiled on-the-fly by @vercel/node; the
// Nest app is booted once at module scope and cached across warm
// invocations.

import 'reflect-metadata'
import express, { type Express, type Request, type Response } from 'express'

let cached: Express | null = null
let bootPromise: Promise<Express> | null = null
let bootStep = 'idle'

async function bootstrap(): Promise<Express> {
  // All heavy imports lazy so /__alive still reports honestly even if
  // the AppModule import chain itself hard-crashes the runtime (the
  // earlier failure mode under @vercel/node).
  bootStep = 'importing-nest'
  const { NestFactory } = await import('@nestjs/core')
  const { ExpressAdapter } = await import('@nestjs/platform-express')
  bootStep = 'importing-app-module'
  const { AppModule } = await import('../src/app.module')
  bootStep = 'creating-app'
  const expressApp = express()
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bufferLogs: true,
  })
  bootStep = 'configuring'

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

  bootStep = 'app-init'
  await app.init()
  bootStep = 'ready'
  return expressApp as unknown as Express
}

export default async function handler(req: Request, res: Response) {
  // Diagnostic probe — survives even when bootstrap throws/crashes so
  // we can confirm the lambda process is reachable.
  // /__step/N — each step a separate cold start so a hard crash at
  // step N tells us where the natives die. Order: nest → app-module →
  // nest-factory → app-init.
  const path = (req.url || '/').split('?')[0]
  if (path === '/__step/prisma') {
    try {
      const { PrismaClient } = await import('@prisma/client')
      const p = new PrismaClient()
      const rows = (await p.$queryRaw`SELECT 1 as ok`) as Array<{ ok: number }>
      await p.$disconnect()
      json(res, 200, { ok: true, step: 'prisma', rows })
      return
    } catch (err) {
      json(res, 500, { ok: false, step: 'prisma', message: errMsg(err) })
      return
    }
  }
  if (path === '/__step/nest-min') {
    try {
      const { NestFactory } = await import('@nestjs/core')
      const { Module } = await import('@nestjs/common')
      // Synthetic minimal module to test Nest infrastructure in isolation
      // of our AppModule's transitive provider graph.
      // biome-ignore lint/correctness/noUnusedVariables: decorator side effect
      @Module({})
      class TinyModule {}
      const app = await NestFactory.create(TinyModule, { bufferLogs: true })
      json(res, 200, { ok: true, step: 'nest-min', appCreated: !!app })
      return
    } catch (err) {
      json(res, 500, { ok: false, step: 'nest-min', message: errMsg(err) })
      return
    }
  }
  // /__module/<name> — instantiate just one context module to find
  // which one's provider graph hard-crashes Nest. Returns module list
  // when called bare.
  if (path === '/__module' || path.startsWith('/__module/')) {
    const which = path.replace('/__module/', '').trim()
    const MODULES: Record<string, () => Promise<{ default?: unknown } & Record<string, unknown>>> =
      {
        identity: () => import('../src/contexts/identity/identity.module'),
        curriculum: () => import('../src/contexts/curriculum/curriculum.module'),
        assessment: () => import('../src/contexts/assessment/assessment.module'),
        learning: () => import('../src/contexts/learning/learning.module'),
        tutoring: () => import('../src/contexts/tutoring/tutoring.module'),
        certification: () => import('../src/contexts/certification/certification.module'),
        notifications: () => import('../src/contexts/notifications/notifications.module'),
        loyalty: () => import('../src/contexts/loyalty/loyalty.module'),
        careers: () => import('../src/contexts/careers/careers.module'),
        'content-marketing': () =>
          import('../src/contexts/content-marketing/content-marketing.module'),
      }
    if (!which || !MODULES[which]) {
      json(res, 200, { ok: true, available: Object.keys(MODULES) })
      return
    }
    try {
      const { NestFactory } = await import('@nestjs/core')
      const mod = await MODULES[which]()
      const ModuleClass = Object.values(mod).find(
        (v): v is new (...args: unknown[]) => unknown => typeof v === 'function',
      )
      if (!ModuleClass) throw new Error(`no class export found on contexts/${which}`)
      const app = await NestFactory.create(ModuleClass, { bufferLogs: true })
      json(res, 200, { ok: true, module: which, appCreated: !!app })
      return
    } catch (err) {
      json(res, 500, { ok: false, module: which, message: errMsg(err) })
      return
    }
  }

  if (path === '/__step/nest-factory') {
    try {
      const { NestFactory } = await import('@nestjs/core')
      const { AppModule } = await import('../src/app.module')
      const app = await NestFactory.create(AppModule, { bufferLogs: true })
      json(res, 200, { ok: true, step: 'nest-factory', appCreated: !!app })
      return
    } catch (err) {
      json(res, 500, { ok: false, step: 'nest-factory', message: errMsg(err) })
      return
    }
  }
  if (path === '/__step/app-module') {
    try {
      const { AppModule } = await import('../src/app.module')
      json(res, 200, { ok: true, step: 'app-module', hasAppModule: !!AppModule })
      return
    } catch (err) {
      json(res, 500, { ok: false, step: 'app-module', message: errMsg(err) })
      return
    }
  }
  if (path === '/__step/nest') {
    try {
      const { NestFactory } = await import('@nestjs/core')
      json(res, 200, { ok: true, step: 'nest', hasNestFactory: !!NestFactory })
      return
    } catch (err) {
      json(res, 500, { ok: false, step: 'nest', message: errMsg(err) })
      return
    }
  }

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
        bootStep,
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
        step: bootStep,
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

function json(res: Response, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return `${err.message}\n${err.stack ?? ''}`.slice(0, 1500)
  return String(err).slice(0, 1500)
}
