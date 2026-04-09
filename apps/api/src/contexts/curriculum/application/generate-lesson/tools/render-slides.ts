/**
 * render_slides — generate one PNG per scene.
 *
 * Builds an SVG with the scene's title + visual cue text, then rasterises to
 * PNG via @resvg/resvg-js. No headless browser needed; pure WASM under the hood.
 *
 * 1920×1080 (Full HD) at the source; ffmpeg downscales if needed.
 */

import { z } from 'zod'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Tool } from '../../../../tutoring/agent/tool'
import type { ArtifactCache } from '../artifact-cache'

const Input = z.object({
  scenes: z.array(z.object({ scene: z.number(), visualCue: z.string() })),
  title: z.string(),
})

export type SlidesOutput = { slidePaths: string[] }

export const buildRenderSlidesTool = (
  cache: ArtifactCache,
  bound: { market: 'india' | 'ksa'; slug: string },
): Tool<z.infer<typeof Input>, SlidesOutput> => ({
  name: 'render_slides',
  description() {
    return 'Render one 1920×1080 PNG slide per scene from the visual cue text. Used by assemble_video to compose the final MP4.'
  },
  inputSchema: Input,
  async call(input, ctx) {
    const cached = await cache.get<SlidesOutput>('slides.json')
    if (cached) {
      ctx.onProgress?.({ tool: this.name, message: 'cache hit' })
      return { ok: true, output: cached }
    }

    try {
      const { Resvg } = await import('@resvg/resvg-js')

      const repoRoot = process.env.SA_REPO_ROOT ?? process.cwd()
      const slidesDir = resolve(
        repoRoot,
        'contexts/curriculum/seed',
        bound.market,
        'generated',
        bound.slug,
        'slides',
      )
      await mkdir(slidesDir, { recursive: true })

      const slidePaths: string[] = []
      for (const scene of input.scenes) {
        const svg = makeSlideSvg({
          title: input.title,
          sceneNumber: scene.scene,
          totalScenes: input.scenes.length,
          body: scene.visualCue,
        })
        const png = new Resvg(svg, {
          fitTo: { mode: 'width', value: 1920 },
          font: { loadSystemFonts: true },
        })
          .render()
          .asPng()
        const path = resolve(slidesDir, `${String(scene.scene).padStart(3, '0')}.png`)
        await writeFile(path, png)
        slidePaths.push(path)
      }

      const out: SlidesOutput = { slidePaths }
      await cache.set('slides.json', out)
      return { ok: true, output: out }
    } catch (err) {
      return { ok: false, error: (err as Error).message, retryable: true }
    }
  },
})

/**
 * Build a minimal slide as SVG. We avoid wrap-aware text layout by hand-wrapping
 * on word boundaries; good enough for accounting lesson visual cues which are
 * typically 1-3 short lines.
 */
function makeSlideSvg(args: {
  title: string
  sceneNumber: number
  totalScenes: number
  body: string
}): string {
  const lines = wrap(args.body, 42)
  const linesXml = lines
    .map((line, i) => `<tspan x="120" dy="${i === 0 ? 0 : 64}">${escapeXml(line)}</tspan>`)
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <rect width="1920" height="1080" fill="#0f172a"/>
  <text x="120" y="160" font-family="Helvetica, Arial, sans-serif" font-size="32" fill="#94a3b8" font-weight="500">SuperAccountant · ${args.sceneNumber} / ${args.totalScenes}</text>
  <text x="120" y="220" font-family="Helvetica, Arial, sans-serif" font-size="36" fill="#cbd5e1" font-weight="600">${escapeXml(args.title)}</text>
  <line x1="120" y1="280" x2="1800" y2="280" stroke="#334155" stroke-width="2"/>
  <text x="120" y="420" font-family="Helvetica, Arial, sans-serif" font-size="56" fill="#ffffff" font-weight="500">
    ${linesXml}
  </text>
</svg>`
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) {
      if (cur) lines.push(cur)
      cur = w
    } else {
      cur = (cur + ' ' + w).trim()
    }
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 10) // safety
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
