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
