/**
 * One-shot: scan every lesson cache directory and delete voice.json /
 * slides.json / video.json files that contain `placeholder://` URLs (or are
 * absent). Re-running generate:lesson afterward triggers a real Azure TTS +
 * resvg + ffmpeg pass.
 *
 * Usage:
 *   pnpm --filter @sa/api exec tsx src/cli/clear-placeholder-media.ts
 */

import { readdir, readFile, unlink, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const repoRoot = process.env.SA_REPO_ROOT ?? process.cwd()

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function isPlaceholder(jsonPath: string): Promise<boolean> {
  try {
    const raw = await readFile(jsonPath, 'utf8')
    return raw.includes('placeholder://')
  } catch {
    return false
  }
}

async function main() {
  let cleared = 0
  let scanned = 0

  for (const market of ['india', 'ksa'] as const) {
    const root = resolve(repoRoot, 'contexts/curriculum/seed', market, 'generated')
    if (!(await exists(root))) continue
    const slugs = await readdir(root)
    for (const slug of slugs) {
      if (slug.startsWith('__')) continue // skip __certificates etc.
      scanned++
      const dir = resolve(root, slug)
      for (const f of ['voice.json', 'slides.json', 'video.json']) {
        const path = resolve(dir, f)
        if (await isPlaceholder(path)) {
          await unlink(path)
          cleared++
          process.stdout.write(`× ${market}/${slug}/${f}\n`)
        }
      }
    }
  }

  console.log(`\nScanned ${scanned} lesson dirs, removed ${cleared} placeholder media files.`)
  console.log('Re-run generation to trigger real Azure TTS + ffmpeg.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
