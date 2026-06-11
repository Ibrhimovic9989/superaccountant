// Vercel serverless entry — minimal. Requires the precompiled
// `dist/vercel-bootstrap.js` produced by `nest build`. All deps are
// resolved through Node's normal module resolution against
// node_modules; Vercel's nft traces from this entry through the
// require chain and bundles what's needed.
//
// We're back to this shape after the esbuild bundling attempt
// silently broke NestJS DI metadata (FUNCTION_INVOCATION_FAILED with
// no catchable stack). The workspace packages (@sa/ai/config/db/
// email/types) now ship pre-compiled dist/, so nft doesn't trip on
// .ts source files in workspace mains.

let cached = null

module.exports = async function handler(req, res) {
  try {
    if (!cached) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('../dist/vercel-bootstrap.js')
      cached = mod.handleRequest ?? mod.default?.handleRequest
      if (!cached) throw new Error('handleRequest export not found on vercel-bootstrap.js')
    }
    await cached(req, res)
  } catch (err) {
    try {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          ok: false,
          where: cached ? 'request-handler' : 'cold-start',
          message: err && err.message ? err.message : String(err),
          stack: err && err.stack ? String(err.stack).split('\n').slice(0, 12) : null,
        }),
      )
    } catch {}
  }
}

module.exports.config = {
  runtime: 'nodejs',
  maxDuration: 90,
}
