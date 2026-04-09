import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Pin turbopack root to the monorepo root (../..) — that's where pnpm
// hoists `next` and where the workspace lockfile lives. Without this,
// Next walks up the directory tree and gets confused by any stray
// lockfile in the user's home folder.
const monorepoRoot = resolve(__dirname, '..', '..')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: { root: monorepoRoot },
  // Hoist workspace packages so Next can transpile their TS source.
  transpilePackages: ['@sa/ai', '@sa/config', '@sa/db', '@sa/email', '@sa/i18n', '@sa/types', '@sa/ui'],
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
}

export default nextConfig
