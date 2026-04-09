/**
 * Video streaming route — serves the MP4s the GenerateLessonAgent produced
 * straight from the artifact cache directory on disk.
 *
 * Path layout:
 *   /api/video/{market}/{slug}/{file}
 *
 *   market: "india" | "ksa"
 *   slug:   curriculum lesson slug
 *   file:   "en.mp4" | "ar.mp4"
 *
 * Supports HTTP Range requests so the browser can seek without downloading
 * the whole file. This is mandatory for <video> elements in Chrome/Safari/
 * Firefox.
 *
 * For production we'll swap to Supabase Storage uploads — `videoUrl` on
 * CurriculumLesson would point at the public Storage URL instead of this
 * route. The lesson page reads `videoUrl` directly so the swap is local
 * to publish_lesson.
 */

import { createReadStream, statSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { NextResponse } from 'next/server'

const ALLOWED_FILES = new Set(['en.mp4', 'ar.mp4'])
const ALLOWED_MARKETS = new Set(['india', 'ksa'])

function safeSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug)
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ market: string; slug: string; file: string }> },
) {
  const { market, slug, file } = await params

  if (!ALLOWED_MARKETS.has(market) || !safeSlug(slug) || !ALLOWED_FILES.has(file)) {
    return new NextResponse('not found', { status: 404 })
  }

  const repoRoot = process.env.SA_REPO_ROOT ?? process.cwd()
  const filename = file === 'en.mp4' ? 'video.en.mp4' : 'video.ar.mp4'
  const path = resolve(
    repoRoot,
    'contexts/curriculum/seed',
    market,
    'generated',
    slug,
    filename,
  )

  if (!existsSync(path)) {
    return new NextResponse('not found', { status: 404 })
  }

  const stat = statSync(path)
  const fileSize = stat.size
  const range = req.headers.get('range')

  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range)
    if (match) {
      const start = Number.parseInt(match[1]!, 10)
      const end = match[2] ? Number.parseInt(match[2]!, 10) : fileSize - 1
      const chunkSize = end - start + 1
      const stream = createReadStream(path, { start, end })
      return new NextResponse(stream as unknown as ReadableStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': 'video/mp4',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }
  }

  const stream = createReadStream(path)
  return new NextResponse(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      'Content-Length': String(fileSize),
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
