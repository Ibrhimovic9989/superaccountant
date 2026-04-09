/**
 * assemble_video — concatenate slides + audio into final EN and AR MP4s.
 *
 * Uses ffmpeg-static for the binary (no system install needed). For each scene
 * we build an "image with audio" segment, then concat all segments. Two passes:
 * one for EN, one for AR.
 *
 * If the upstream voice tool returned placeholder URLs (Azure Speech not
 * configured), we skip ffmpeg and pass placeholders through.
 */

import { z } from 'zod'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Tool } from '../../../../tutoring/agent/tool'
import type { ArtifactCache } from '../artifact-cache'

const Input = z.object({
  slidePaths: z.array(z.string()),
  audioEnPaths: z.array(z.string()),
  audioArPaths: z.array(z.string()),
})

export type VideoOutput = { videoEnPath: string; videoArPath: string }

export const buildAssembleVideoTool = (
  cache: ArtifactCache,
  bound: { market: 'india' | 'ksa'; slug: string },
): Tool<z.infer<typeof Input>, VideoOutput> => ({
  name: 'assemble_video',
  description() {
    return 'Concatenate slides + per-scene audio into final EN and AR MP4 files using ffmpeg.'
  },
  inputSchema: Input,
  async call(input, ctx) {
    const cached = await cache.get<VideoOutput>('video.json')
    if (cached) {
      ctx.onProgress?.({ tool: this.name, message: 'cache hit' })
      return { ok: true, output: cached }
    }

    // If voices were placeholders, pass through.
    if (input.audioEnPaths.some((p) => p.startsWith('placeholder://'))) {
      const out: VideoOutput = {
        videoEnPath: 'placeholder://video/en.mp4',
        videoArPath: 'placeholder://video/ar.mp4',
      }
      await cache.set('video.json', out)
      ctx.onProgress?.({
        tool: this.name,
        message: 'voice was placeholder — skipping ffmpeg',
      })
      return { ok: true, output: out }
    }

    try {
      const ffmpegStatic = (await import('ffmpeg-static')).default as unknown as string | null
      const ffmpegBin = ffmpegStatic ?? 'ffmpeg'
      if (!ffmpegBin) throw new Error('ffmpeg binary not found')

      const repoRoot = process.env.SA_REPO_ROOT ?? process.cwd()
      const dir = resolve(
        repoRoot,
        'contexts/curriculum/seed',
        bound.market,
        'generated',
        bound.slug,
      )
      await mkdir(dir, { recursive: true })

      const enPath = resolve(dir, 'video.en.mp4')
      const arPath = resolve(dir, 'video.ar.mp4')

      ctx.onProgress?.({ tool: this.name, message: 'ffmpeg EN' })
      await assemble({
        ffmpegBin,
        slides: input.slidePaths,
        audios: input.audioEnPaths,
        outPath: enPath,
        workDir: dir,
      })
      ctx.onProgress?.({ tool: this.name, message: 'ffmpeg AR' })
      await assemble({
        ffmpegBin,
        slides: input.slidePaths,
        audios: input.audioArPaths,
        outPath: arPath,
        workDir: dir,
      })

      const out: VideoOutput = { videoEnPath: enPath, videoArPath: arPath }
      await cache.set('video.json', out)
      return { ok: true, output: out }
    } catch (err) {
      return { ok: false, error: (err as Error).message, retryable: true }
    }
  },
})

/**
 * Build a single MP4 from N image+audio segments. We use ffmpeg's concat demuxer
 * after creating per-scene MP4 segments. This is more reliable across platforms
 * than the more compact filter_complex approach.
 */
async function assemble(args: {
  ffmpegBin: string
  slides: string[]
  audios: string[]
  outPath: string
  workDir: string
}): Promise<void> {
  if (args.slides.length !== args.audios.length) {
    throw new Error(`mismatch: ${args.slides.length} slides vs ${args.audios.length} audios`)
  }
  // Per-scene segments: convert each (image + audio) into an MP4.
  const segments: string[] = []
  for (let i = 0; i < args.slides.length; i++) {
    const segPath = resolve(args.workDir, `seg-${String(i).padStart(3, '0')}.mp4`)
    await runFfmpeg(args.ffmpegBin, [
      '-y',
      '-loop', '1',
      '-i', args.slides[i]!,
      '-i', args.audios[i]!,
      '-c:v', 'libx264',
      '-tune', 'stillimage',
      '-c:a', 'aac',
      '-b:a', '96k',
      '-pix_fmt', 'yuv420p',
      '-shortest',
      '-vf', 'scale=1280:720',
      segPath,
    ])
    segments.push(segPath)
  }
  // Concat list file.
  const listPath = resolve(args.workDir, 'concat.txt')
  await writeFile(listPath, segments.map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join('\n'))
  await runFfmpeg(args.ffmpegBin, [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-c', 'copy',
    args.outPath,
  ])
}

function runFfmpeg(bin: string, args: string[]): Promise<void> {
  return new Promise((resolve_, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr?.on('data', (d) => {
      stderr += d.toString()
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve_()
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-500)}`))
    })
  })
}
