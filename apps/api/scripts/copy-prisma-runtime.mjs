// Post-build: copy the Prisma client + generated artefacts + engine
// binary into apps/api/dist/node_modules/ so the bundled
// dist/vercel-bundle.cjs can resolve `require('@prisma/client')` at
// runtime on Vercel without depending on pnpm's symlink chain.
//
// We do this rather than bundling @prisma/client through esbuild
// because the client dynamically resolves the engine binary path at
// runtime — bundling breaks that resolution.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
const apiRoot = resolve(__d, '..')
const monoRoot = resolve(apiRoot, '..', '..')
const distNodeModules = join(apiRoot, 'dist', 'node_modules')

// Find the pnpm-installed copies. We don't follow apps/api/node_modules
// symlinks because zip + symlinks across Vercel is brittle — we walk the
// .pnpm store and grab the real directories.
const pnpmDir = join(monoRoot, 'node_modules', '.pnpm')
if (!existsSync(pnpmDir)) {
  console.error(`[copy:prisma] expected pnpm store at ${pnpmDir}`)
  process.exit(1)
}

function findPnpmPackage(prefix) {
  const matches = readdirSync(pnpmDir).filter((name) => name.startsWith(prefix))
  if (matches.length === 0) {
    console.error(`[copy:prisma] no pnpm package matches "${prefix}*"`)
    process.exit(1)
  }
  // Pick the first; multiple entries are usually peer-dep permutations.
  return join(pnpmDir, matches[0], 'node_modules')
}

// 1. @prisma/client (the public package)
const prismaClientPnpm = findPnpmPackage('@prisma+client@')
copyDir(join(prismaClientPnpm, '@prisma', 'client'), join(distNodeModules, '@prisma', 'client'))
// `.prisma/client` is the generated client (sibling of @prisma/client
// inside the same pnpm leaf). May or may not be present here depending
// on whether `prisma generate` ran into the leaf — it does because we
// run `pnpm --filter @sa/db generate` against packages/db whose deps
// land here.
copyOptional(
  join(prismaClientPnpm, '.prisma', 'client'),
  join(distNodeModules, '.prisma', 'client'),
)

// 2. The engines package (carries libquery_engine + schema-engine binaries).
const enginesPnpm = findPnpmPackage('@prisma+engines@')
copyDir(
  join(enginesPnpm, '@prisma', 'engines'),
  join(distNodeModules, '@prisma', 'engines'),
)

// 3. Debug + fetch-engine + get-platform (Prisma client requires these
// at runtime to resolve the right binary for the host).
for (const pkg of ['debug', 'fetch-engine', 'get-platform', 'engines-version']) {
  const root = findPnpmPackage(`@prisma+${pkg}@`)
  copyDir(join(root, '@prisma', pkg), join(distNodeModules, '@prisma', pkg))
}

// Prune non-Linux query-engine binaries. Vercel functions run on
// Amazon Linux 2 (rhel-openssl 3.0.x); shipping Windows / Darwin
// binaries pushes the bundle past Vercel's 250MB unzipped limit. We
// keep the rhel-openssl-{1.0.x,3.0.x} variants — both are present in
// Prisma's distribution because the underlying glibc version varies.
const KEEP = /rhel-openssl-(1\.0\.x|3\.0\.x)/
pruneBinaries(join(distNodeModules, '@prisma', 'engines'))
pruneBinaries(join(distNodeModules, '.prisma', 'client'))

console.log('[copy:prisma] runtime ready')

function pruneBinaries(root) {
  if (!existsSync(root)) return
  for (const entry of readdirSync(root)) {
    const p = join(root, entry)
    // Engine binaries include:
    //   libquery_engine-<target>.so.node          (Linux)
    //   query_engine-<target>.dylib.node          (macOS)
    //   query_engine-<target>.dll.node            (Windows)
    //   schema-engine-<target>(.exe)
    //   query_engine-<target>.dll.node.tmpNNN     (concurrent-gen leftovers)
    const looksLikeEngine =
      /query_engine/.test(entry) || /^schema-engine/.test(entry) || /^prisma-fmt/.test(entry)
    if (!looksLikeEngine) continue
    if (KEEP.test(entry)) continue
    try {
      rmSync(p, { force: true })
    } catch {}
  }
  // Recurse into the @prisma/engines internal dirs that ship binaries.
  for (const entry of readdirSync(root)) {
    const p = join(root, entry)
    try {
      if (statSync(p).isDirectory()) pruneBinaries(p)
    } catch {}
  }
}

function copyDir(src, dst) {
  if (!existsSync(src)) {
    console.error(`[copy:prisma] missing source: ${src}`)
    process.exit(1)
  }
  mkdirSync(dirname(dst), { recursive: true })
  cpSync(src, dst, { recursive: true, dereference: true })
  console.log(`  ${src.replace(monoRoot, '$ROOT')} → ${dst.replace(apiRoot, '$API')}`)
}

function copyOptional(src, dst) {
  if (!existsSync(src)) {
    console.log(`  (skipped, not present: ${src.replace(monoRoot, '$ROOT')})`)
    return
  }
  copyDir(src, dst)
}

// Tiny utility used above; flagged so it's not pruned.
void statSync
