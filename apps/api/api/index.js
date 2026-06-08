// Vercel serverless function entry. Plain JS so @vercel/node does not
// re-validate `src/` under strict tsc (see vercel-bootstrap.ts for the
// rationale). On cold start we lazy-require the compiled bootstrap
// (produced by `nest build` into `apps/api/dist/`) and delegate every
// HTTP request through it.

let cachedHandler = null

module.exports = async function handler(req, res) {
  if (!cachedHandler) {
    // Compiled by `nest build` from src/vercel-bootstrap.ts
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../dist/vercel-bootstrap.js')
    cachedHandler = mod.handleRequest
  }
  await cachedHandler(req, res)
}

module.exports.config = {
  runtime: 'nodejs',
  // /blog/auto-generate runs ~45s; 90s leaves headroom without
  // inviting hung-request abuse.
  maxDuration: 90,
}
