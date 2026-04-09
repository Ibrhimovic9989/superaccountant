import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Pin to the monorepo root — that's where pnpm hoists `next` and the
// workspace lockfile lives. Stops the warning about stray lockfiles.
const monorepoRoot = resolve(__dirname, '..', '..')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: { root: monorepoRoot },
  // Marketing pages are pure content — make every page static where possible.
  experimental: {
    serverActions: { bodySizeLimit: '512kb' },
  },
}

export default nextConfig
