// Load repo-root .env BEFORE any imports that touch process.env.
import { readFileSync as _readFileSync } from 'node:fs'
import { resolve as _resolve } from 'node:path'
const _envPath = _resolve(process.env.SA_REPO_ROOT ?? process.cwd(), '.env')
try {
  for (const _line of _readFileSync(_envPath, 'utf8').split('\n')) {
    const _m = /^([A-Z0-9_]+)=(.*)$/.exec(_line.trim())
    if (_m && !process.env[_m[1]!]) process.env[_m[1]!] = _m[2]!.replace(/^"|"$/g, '')
  }
} catch {
  // env may already be set by the shell
}

import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { loadEnv } from '@sa/config'

async function bootstrap() {
  const env = loadEnv()
  const app = await NestFactory.create(AppModule, { bufferLogs: true })

  // CORS — accept the production web app + marketing site, plus localhost in dev.
  // ALLOWED_ORIGINS is a comma-separated list set in env (Vercel deploy URLs).
  const allowed = (process.env.ALLOWED_ORIGINS ?? env.NEXTAUTH_URL ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  app.enableCors({
    origin: (origin, cb) => {
      // Allow same-origin (no Origin header) + explicit allowlist + Vercel previews.
      if (!origin) return cb(null, true)
      if (allowed.includes(origin)) return cb(null, true)
      if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return cb(null, true)
      return cb(new Error(`CORS: origin ${origin} not allowed`))
    },
    credentials: true,
  })

  // Strip unknown fields and reject obviously bad payloads at the boundary.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }),
  )

  // Trust the nginx proxy in front of us — needed so the throttler keys
  // requests by the real client IP and not by 127.0.0.1.
  const httpAdapter = app.getHttpAdapter().getInstance() as { set?: (k: string, v: unknown) => void }
  httpAdapter.set?.('trust proxy', 'loopback')

  // Health endpoint (used by nginx + Azure load balancers + uptime checks).
  // Mounted at the express level so it bypasses guards/throttling.
  httpAdapter.set?.('etag', false)
  ;(httpAdapter as unknown as { get: (path: string, h: (req: unknown, res: { json: (b: unknown) => void }) => void) => void }).get?.(
    '/health',
    (_req, res) => {
      res.json({ ok: true, ts: new Date().toISOString(), service: '@sa/api' })
    },
  )

  // Graceful shutdown — wait for in-flight SSE streams to drain on SIGTERM.
  app.enableShutdownHooks()

  // In production we bind to 127.0.0.1 because nginx is the public face.
  // In dev we bind to 0.0.0.0 so emulators / devices can hit it.
  const host = process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0'
  const port = Number(process.env.PORT ?? env.API_PORT ?? 4000)
  await app.listen(port, host)
  console.log(`[api] listening on ${host}:${port}`)
}

bootstrap()
