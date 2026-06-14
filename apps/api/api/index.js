// Vercel serverless entry — with process-level error capture so even
// async/uncaught rejections surface as JSON instead of killing the
// lambda with FUNCTION_INVOCATION_FAILED.

let lastError = null
process.on('uncaughtException', (err) => {
  lastError = err
  // eslint-disable-next-line no-console
  console.error('[lambda] uncaughtException:', err && err.stack ? err.stack : err)
})
process.on('unhandledRejection', (err) => {
  lastError = err
  // eslint-disable-next-line no-console
  console.error('[lambda] unhandledRejection:', err && err.stack ? err.stack : err)
})

let cached = null

module.exports = async function handler(req, res) {
  // Probes that bypass the bootstrap chain so we can tell whether the
  // function process is alive at all even when bootstrap explodes.
  const url = req.url || '/'
  if (url.startsWith('/__alive')) {
    return write(res, 200, {
      ok: true,
      nodeVersion: process.version,
      lastError: lastError ? String(lastError) : null,
      pid: process.pid,
      uptime: process.uptime(),
    })
  }

  // Step-by-step probes so we can isolate which require() crashes the
  // lambda hard. /__probe/1 = bootstrap module load only.
  if (url.startsWith('/__probe/1')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('../dist/vercel-bootstrap.js')
      return write(res, 200, {
        ok: true,
        modKeys: Object.keys(mod).slice(0, 10),
        hasHandleRequest: typeof mod.handleRequest === 'function',
      })
    } catch (err) {
      return write(res, 500, {
        ok: false,
        where: 'require-bootstrap',
        message: err && err.message ? err.message : String(err),
        stack: err && err.stack ? String(err.stack).split('\n').slice(0, 14) : null,
      })
    }
  }

  // /__probe/2 = NestFactory.create only, no handleRequest call.
  if (url.startsWith('/__probe/2')) {
    try {
      require('reflect-metadata')
      const { NestFactory } = require('@nestjs/core')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppModule } = require('../dist/app.module.js')
      const app = await NestFactory.create(AppModule, { bufferLogs: true })
      return write(res, 200, { ok: true, appCreated: !!app })
    } catch (err) {
      return write(res, 500, {
        ok: false,
        where: 'nestfactory-create',
        message: err && err.message ? err.message : String(err),
        stack: err && err.stack ? String(err.stack).split('\n').slice(0, 18) : null,
      })
    }
  }

  try {
    if (!cached) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('../dist/vercel-bootstrap.js')
      cached = mod.handleRequest ?? mod.default?.handleRequest
      if (!cached) throw new Error('handleRequest export not found on vercel-bootstrap.js')
    }
    await cached(req, res)
  } catch (err) {
    write(res, 500, {
      ok: false,
      where: cached ? 'request-handler' : 'cold-start',
      message: err && err.message ? err.message : String(err),
      stack: err && err.stack ? String(err.stack).split('\n').slice(0, 12) : null,
      lastError: lastError ? String(lastError) : null,
    })
  }
}

module.exports.config = { runtime: 'nodejs', maxDuration: 90 }

function write(res, status, body) {
  try {
    if (!res.writableEnded) {
      res.statusCode = status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(body))
    }
  } catch {
    // last-ditch
  }
}
