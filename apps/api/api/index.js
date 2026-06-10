// Vercel serverless entry. Plain JS so @vercel/node's TS step has
// nothing to validate. Requires the esbuild-bundled output (see
// apps/api/package.json#scripts.bundle:vercel) which inlines all
// workspace deps into a single CJS file — that's what stops Vercel
// from tracing back into packages/*/src/*.ts during function bundling.

let cached = null
let bootError = null

module.exports = async function handler(req, res) {
  try {
    if (!cached) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('../dist/vercel-bundle.cjs')
      cached = mod.handleRequest ?? mod.default?.handleRequest
      if (!cached) throw new Error('handleRequest export not found on vercel-bundle.cjs')
    }
    await cached(req, res)
  } catch (err) {
    if (!bootError) bootError = err
    // Surface the error in the response body so we can debug without
    // depending on Vercel's runtime-log access (which the team plan
    // doesn't expose via API). Drop this once the deploy is stable.
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
    } catch {
      // last-ditch: let Vercel render its own 500 page
    }
  }
}

module.exports.config = {
  runtime: 'nodejs',
  // /blog/auto-generate hits ~45s with Azure; OpenRouter free tier is
  // often slower (queue + retries through the cascade), so headroom up
  // to 90s. Pro plan max is 300s if we need to bump later.
  maxDuration: 90,
}
