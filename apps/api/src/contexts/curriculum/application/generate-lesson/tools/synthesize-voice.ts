/**
 * synthesize_voice — real Azure Speech TTS implementation.
 *
 * Falls back to placeholder URLs (and logs a warning) if Azure Speech credentials
 * are not configured. This keeps the lesson pipeline working in dev environments
 * that haven't provisioned Speech yet.
 */

import { z } from 'zod'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { azureSpeech } from '@sa/ai'
import type { Tool } from '../../../../tutoring/agent/tool'
import type { ArtifactCache } from '../artifact-cache'

const Input = z.object({
  scenes: z.array(
    z.object({ scene: z.number(), narrationEn: z.string(), narrationAr: z.string() }),
  ),
})

export type VoiceOutput = { audioEnPaths: string[]; audioArPaths: string[] }

export const buildSynthesizeVoiceTool = (
  cache: ArtifactCache,
  bound: { market: 'india' | 'ksa'; slug: string },
): Tool<z.infer<typeof Input>, VoiceOutput> => ({
  name: 'synthesize_voice',
  description() {
    return 'Synthesize narration audio for each scene in EN and AR via Azure Speech TTS. Returns per-scene audio file paths under the lesson cache directory.'
  },
  inputSchema: Input,
  async call(input, ctx) {
    const cached = await cache.get<VoiceOutput>('voice.json')
    if (cached) {
      ctx.onProgress?.({ tool: this.name, message: 'cache hit' })
      return { ok: true, output: cached }
    }

    if (!azureSpeech.isConfigured()) {
      ctx.onProgress?.({
        tool: this.name,
        message: 'Azure Speech not configured — falling back to placeholders',
      })
      const fallback: VoiceOutput = {
        audioEnPaths: input.scenes.map((s) => `placeholder://voice/en/scene-${s.scene}.mp3`),
        audioArPaths: input.scenes.map((s) => `placeholder://voice/ar/scene-${s.scene}.mp3`),
      }
      await cache.set('voice.json', fallback)
      return { ok: true, output: fallback }
    }

    const repoRoot = process.env.SA_REPO_ROOT ?? process.cwd()
    const audioDir = resolve(
      repoRoot,
      'contexts/curriculum/seed',
      bound.market,
      'generated',
      bound.slug,
      'audio',
    )
    await mkdir(audioDir, { recursive: true })

    const audioEnPaths: string[] = []
    const audioArPaths: string[] = []
    try {
      for (const scene of input.scenes) {
        ctx.onProgress?.({ tool: this.name, message: `tts scene ${scene.scene}` })
        const enBuf = await azureSpeech.synthesize({ text: scene.narrationEn, locale: 'en' })
        const arBuf = await azureSpeech.synthesize({ text: scene.narrationAr, locale: 'ar' })
        const enPath = resolve(audioDir, `${scene.scene}.en.mp3`)
        const arPath = resolve(audioDir, `${scene.scene}.ar.mp3`)
        await writeFile(enPath, enBuf)
        await writeFile(arPath, arBuf)
        audioEnPaths.push(enPath)
        audioArPaths.push(arPath)
      }
      const out: VoiceOutput = { audioEnPaths, audioArPaths }
      await cache.set('voice.json', out)
      return { ok: true, output: out }
    } catch (err) {
      return { ok: false, error: (err as Error).message, retryable: true }
    }
  },
})
