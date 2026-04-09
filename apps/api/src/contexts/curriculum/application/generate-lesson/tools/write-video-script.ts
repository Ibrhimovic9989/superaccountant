import { z } from 'zod'
import { azureOpenAI } from '@sa/ai'
import type { Tool } from '../../../../tutoring/agent/tool'
import type { ArtifactCache } from '../artifact-cache'

const Input = z.object({
  mdxEn: z.string().min(50),
  mdxAr: z.string().min(50),
  title: z.string(),
  targetMinutes: z.number().int().min(2).max(15).default(6),
})

// Tolerant: scene number / duration are auto-filled if the model omits them.
const SceneSchema = z.object({
  scene: z.number().int().optional(),
  visualCue: z.string(),
  narrationEn: z.string(),
  narrationAr: z.string(),
  durationSec: z.number().int().min(5).max(120).optional(),
})

export type ScriptOutput = { scenes: z.infer<typeof SceneSchema>[] }

const SYSTEM = `You are a video script writer for accounting courses. Convert the lesson body into a sequence of 6-12 scenes. Each scene has:
- A "visualCue" (short description of what should appear on the slide — text, diagram, table)
- "narrationEn" (1-3 sentences, conversational, what the narrator says)
- "narrationAr" (faithful Arabic translation of the narration, formal MSA)
- "durationSec" (10-90 seconds, sum to roughly the target duration)

Output STRICT JSON: { scenes: [...] }. No commentary outside JSON.`

export const buildWriteVideoScriptTool = (
  cache: ArtifactCache,
): Tool<z.infer<typeof Input>, ScriptOutput> => ({
  name: 'write_video_script',
  description() {
    return 'Convert the bilingual lesson body into a video script with scenes, visual cues, narration in EN and AR, and per-scene duration.'
  },
  inputSchema: Input,
  isReadOnly: () => true,
  async call(input, ctx) {
    const cached = await cache.get<ScriptOutput>('script.json')
    if (cached) {
      ctx.onProgress?.({ tool: this.name, message: 'cache hit' })
      return { ok: true, output: cached }
    }
    try {
      const res = await azureOpenAI().chat.completions.create({
        model: 'placeholder',
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `Lesson: ${input.title}\nTarget: ${input.targetMinutes} minutes\n\nEN body:\n${input.mdxEn}\n\nAR body:\n${input.mdxAr}`,
          },
        ],
        response_format: { type: 'json_object' },
      })
      const parsed = JSON.parse(res.choices[0]?.message.content ?? '{}')
      const rawScenes = z.array(SceneSchema).parse(parsed.scenes)
      // Backfill missing scene numbers + durations.
      const scenes = rawScenes.map((s, i) => ({
        scene: s.scene ?? i + 1,
        visualCue: s.visualCue,
        narrationEn: s.narrationEn,
        narrationAr: s.narrationAr,
        durationSec: s.durationSec ?? 30,
      }))
      const out: ScriptOutput = { scenes }
      await cache.set('script.json', out)
      return { ok: true, output: out }
    } catch (err) {
      return { ok: false, error: (err as Error).message, retryable: true }
    }
  },
})
