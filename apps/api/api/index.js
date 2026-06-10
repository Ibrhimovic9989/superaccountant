// Vercel serverless entry. Plain JS so @vercel/node's TS step has
// nothing to validate. Requires the esbuild-bundled output (see
// apps/api/package.json#scripts.bundle:vercel) which inlines all
// workspace deps into a single CJS file — that's what stops Vercel
// from tracing back into packages/*/src/*.ts during function bundling.

let cached = null

module.exports = async function handler(req, res) {
  if (!cached) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../dist/vercel-bundle.cjs')
    cached = mod.handleRequest ?? mod.default?.handleRequest
  }
  await cached(req, res)
}

module.exports.config = {
  runtime: 'nodejs',
  // /blog/auto-generate hits ~45s with Azure; OpenRouter free tier is
  // often slower (queue + retries through the cascade), so headroom up
  // to 90s. Pro plan max is 300s if we need to bump later.
  maxDuration: 90,
}
