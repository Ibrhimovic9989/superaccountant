import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'

const Bilingual = z.object({ en: z.string(), ar: z.string() })

const LessonSeed = z.object({
  slug: z.string().min(1),
  title: Bilingual,
  learning_objectives: z.array(z.string()).min(1),
  sources: z.array(z.string().url()).optional(),
})

const Module = z.object({
  module: z.string(),
  track_code: z.string().optional(),
  lessons: z.array(LessonSeed).min(1),
})

const Phase = z.object({
  phase: z.number().int().positive(),
  title: Bilingual,
  pick: z.number().int().positive().optional(),
  modules: z.array(Module),
})

const Track = z.object({
  track: z.enum(['india', 'ksa']),
  title: Bilingual,
  phases: z.array(Phase).min(1),
})

export type TrackTopics = z.infer<typeof Track>
export type LessonSeedT = z.infer<typeof LessonSeed>

export async function loadTopics(market: 'india' | 'ksa'): Promise<TrackTopics> {
  // Repo root is 4 levels up from apps/api/src/contexts/curriculum/...
  // Resolve via env to keep this robust regardless of how the CLI is launched.
  const repoRoot = process.env.SA_REPO_ROOT ?? resolve(process.cwd())
  const path = resolve(repoRoot, 'contexts/curriculum/seed', market, 'topics.yaml')
  const raw = await readFile(path, 'utf8')
  const parsed = parseYaml(raw)
  return Track.parse(parsed)
}

/** Flatten all lessons across all phases for batch processing. */
export function flattenLessons(track: TrackTopics): Array<{
  phase: number
  module: string
  trackCode?: string
  lesson: LessonSeedT
}> {
  const out: ReturnType<typeof flattenLessons> = []
  for (const phase of track.phases) {
    for (const mod of phase.modules) {
      for (const lesson of mod.lessons) {
        out.push({ phase: phase.phase, module: mod.module, trackCode: mod.track_code, lesson })
      }
    }
  }
  return out
}
