// Vercel serverless entry — stepwise probe mode. Each /__probe/N runs
// one more piece of the cold-start chain so we can identify which
// require kills the lambda (FUNCTION_INVOCATION_FAILED with no body =
// native-binding-level crash, can't catch).

const { existsSync, readdirSync, readFileSync, statSync } = require('node:fs')
const { join } = require('node:path')

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  const url = req.url || '/'

  // --- Probe 0: list dist tree
  if (url.startsWith('/__probe/0')) return ok(res, { distFiles: ls(join(__dirname, '..', 'dist')) })

  // --- Probe 1: require @prisma/client directly
  if (url.startsWith('/__probe/1')) {
    try {
      const c = require('../dist/node_modules/@prisma/client')
      return ok(res, { hasPrismaClient: !!c.PrismaClient })
    } catch (err) {
      return fail(res, 'require @prisma/client', err)
    }
  }

  // --- Probe 2: instantiate PrismaClient
  if (url.startsWith('/__probe/2')) {
    try {
      const { PrismaClient } = require('../dist/node_modules/@prisma/client')
      const p = new PrismaClient()
      await p.$queryRaw`SELECT 1 as ok`
      return ok(res, { prismaQuery: 'SELECT 1 OK' })
    } catch (err) {
      return fail(res, 'instantiate PrismaClient', err)
    }
  }

  // --- Probe 3: require reflect-metadata + @nestjs/core
  if (url.startsWith('/__probe/3')) {
    try {
      require('reflect-metadata')
      const core = require('@nestjs/core')
      return ok(res, { hasNestFactory: !!core.NestFactory })
    } catch (err) {
      return fail(res, 'require nestjs/core', err)
    }
  }

  // --- Probe 4: require vercel-bundle.cjs (the big one)
  if (url.startsWith('/__probe/4')) {
    try {
      const mod = require('../dist/vercel-bundle.cjs')
      return ok(res, {
        hasHandleRequest: !!(mod.handleRequest ?? mod.default?.handleRequest),
        keys: Object.keys(mod).slice(0, 20),
      })
    } catch (err) {
      return fail(res, 'require vercel-bundle.cjs', err)
    }
  }

  // --- Default: full handler
  try {
    const mod = require('../dist/vercel-bundle.cjs')
    const handle = mod.handleRequest ?? mod.default?.handleRequest
    if (!handle) throw new Error('handleRequest not exported from vercel-bundle.cjs')
    return handle(req, res)
  } catch (err) {
    return fail(res, 'full handler', err)
  }
}

module.exports.config = { runtime: 'nodejs', maxDuration: 90 }

function ok(res, body) {
  res.statusCode = 200
  res.end(JSON.stringify({ ok: true, ...body }, null, 2))
}
function fail(res, where, err) {
  res.statusCode = 500
  res.end(
    JSON.stringify(
      {
        ok: false,
        where,
        message: err && err.message ? err.message : String(err),
        stack: err && err.stack ? String(err.stack).split('\n').slice(0, 14) : null,
      },
      null,
      2,
    ),
  )
}
function ls(dir) {
  try {
    return readdirSync(dir).slice(0, 30)
  } catch {
    return null
  }
}
void statSync
void readFileSync
void existsSync
