import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const monorepoRoot = resolve(__dirname, '..', '..')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: { root: monorepoRoot },
  transpilePackages: ['@sa/config', '@sa/db'],
  // Public URL, no auth — but keep it out of Google's index just in case
  // the link ever leaks. `robots` in the root layout metadata does the
  // <meta> tag; this covers /robots.txt too.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
}

export default nextConfig
