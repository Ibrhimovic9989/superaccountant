// Vercel serverless entry — debugging mode. Bundle/Prisma load gated
// behind a query flag so we can confirm the function itself can be
// invoked, then progressively turn on each load step.

const { existsSync, readFileSync, statSync, readdirSync } = require('node:fs')
const { join } = require('node:path')

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')

  const url = req.url || '/'
  if (url.startsWith('/__debug')) {
    const distDir = join(__dirname, '..', 'dist')
    const prismaDir = join(distDir, 'node_modules', '@prisma', 'client')
    res.statusCode = 200
    res.end(
      JSON.stringify(
        {
          ok: true,
          cwd: process.cwd(),
          __dirname,
          distExists: existsSync(distDir),
          distFiles: existsSync(distDir) ? readdirSync(distDir).slice(0, 30) : [],
          bundleExists: existsSync(join(distDir, 'vercel-bundle.cjs')),
          prismaDirExists: existsSync(prismaDir),
          prismaPackageJson: existsSync(join(prismaDir, 'package.json'))
            ? JSON.parse(readFileSync(join(prismaDir, 'package.json'), 'utf8'))?.name
            : null,
          nodeModulesAtRoot: existsSync(join(__dirname, '..', 'node_modules')),
          env: {
            hasOpenrouterKey: !!process.env.OPENROUTER_API_KEY,
            hasJinaKey: !!process.env.JINA_API_KEY,
            hasDbUrl: !!process.env.DATABASE_URL,
          },
        },
        null,
        2,
      ),
    )
    return
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../dist/vercel-bundle.cjs')
    const handle = mod.handleRequest ?? mod.default?.handleRequest
    if (!handle) throw new Error('handleRequest not exported from vercel-bundle.cjs')
    return handle(req, res)
  } catch (err) {
    try {
      res.statusCode = 500
      res.end(
        JSON.stringify({
          ok: false,
          where: 'cold-start-or-handler',
          message: err && err.message ? err.message : String(err),
          stack: err && err.stack ? String(err.stack).split('\n').slice(0, 14) : null,
        }),
      )
    } catch {}
  }
}

module.exports.config = {
  runtime: 'nodejs',
  maxDuration: 90,
}
