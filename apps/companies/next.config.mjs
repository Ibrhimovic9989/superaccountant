import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Pin turbopack root to the monorepo root so Next doesn't walk up into
// the user's home folder chasing a stray lockfile (same as apps/web).
const monorepoRoot = resolve(__dirname, '..', '..')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: { root: monorepoRoot },
  transpilePackages: ['@sa/config', '@sa/db', '@sa/email'],
}

export default nextConfig
