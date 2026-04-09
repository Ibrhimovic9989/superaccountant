/**
 * Upload all lesson video.{en,ar}.mp4 files to Supabase Storage
 * and update the CurriculumLesson.videoUrl in the DB.
 *
 * Usage: node scripts/upload-videos.mjs
 */

import { readFileSync, readdir, stat } from 'node:fs'
import { resolve, dirname, basename, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createReadStream } from 'node:fs'

const __d = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__d, '..')

// Load env
for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const SUPA_URL = process.env.SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'lesson-videos'
const PUBLIC_BASE = `${SUPA_URL}/storage/v1/object/public/${BUCKET}`

const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient()

// Walk the seed directory for video files
import { globSync } from 'node:fs'
let videoFiles
try {
  // Node 22+ has globSync on fs
  const { globSync: g } = await import('glob')
  videoFiles = g('contexts/curriculum/seed/*/generated/*/video.{en,ar}.mp4', { cwd: ROOT })
} catch {
  // Fallback: manually walk
  const { readdirSync, statSync } = await import('node:fs')
  videoFiles = []
  for (const market of ['india', 'ksa']) {
    const genDir = resolve(ROOT, 'contexts/curriculum/seed', market, 'generated')
    try {
      for (const slug of readdirSync(genDir)) {
        const slugDir = resolve(genDir, slug)
        if (!statSync(slugDir).isDirectory()) continue
        for (const lang of ['en', 'ar']) {
          const videoPath = resolve(slugDir, `video.${lang}.mp4`)
          try {
            statSync(videoPath)
            videoFiles.push(`contexts/curriculum/seed/${market}/generated/${slug}/video.${lang}.mp4`)
          } catch {}
        }
      }
    } catch {}
  }
}

console.log(`Found ${videoFiles.length} video files`)

let uploaded = 0
let failed = 0
const urlUpdates = new Map() // slug → { en?: string, ar?: string }

for (const relPath of videoFiles) {
  const parts = relPath.replace(/\\/g, '/').split('/')
  // contexts/curriculum/seed/{market}/generated/{slug}/video.{lang}.mp4
  const market = parts[3]
  const slug = parts[5]
  const lang = parts[6].replace('video.', '').replace('.mp4', '')
  const storagePath = `${market}/${slug}/${lang}.mp4`
  const absPath = resolve(ROOT, relPath)

  const body = readFileSync(absPath)

  const res = await fetch(`${SUPA_URL}/storage/v1/object/${BUCKET}/${storagePath}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPA_KEY}`,
      'Content-Type': 'video/mp4',
      'x-upsert': 'true',
    },
    body,
  })

  if (res.ok) {
    console.log(`✓ ${storagePath} (${(body.length / 1024 / 1024).toFixed(1)}MB)`)
    uploaded++
    if (!urlUpdates.has(slug)) urlUpdates.set(slug, {})
    urlUpdates.get(slug)[lang] = `${PUBLIC_BASE}/${storagePath}`
  } else {
    console.log(`✗ ${storagePath} — ${res.status} ${await res.text().catch(() => '')}`)
    failed++
  }
}

console.log(`\nUploaded: ${uploaded}  Failed: ${failed}`)

// Update DB videoUrl to point at the public Supabase Storage URL
console.log('\nUpdating DB videoUrls...')
let dbUpdated = 0
for (const [slug, urls] of urlUpdates) {
  // Use the EN video as the canonical videoUrl (lesson-shell switches to AR via suffix swap)
  const url = urls.en ?? urls.ar
  if (!url) continue
  try {
    await prisma.curriculumLesson.updateMany({
      where: { slug },
      data: { videoUrl: url },
    })
    dbUpdated++
  } catch (err) {
    console.log(`  ⚠ DB update failed for ${slug}: ${err.message}`)
  }
}

console.log(`DB updated: ${dbUpdated} lessons`)
await prisma.$disconnect()
