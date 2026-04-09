import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

/**
 * Filesystem cache for resumable curriculum generation runs.
 * Per docs/curriculum-pipeline.md — every tool's output is cached so that
 * a failed render or translation can be retried without re-running upstream
 * stages. Mirrors Claude Code's per-run artifact directory pattern.
 *
 * Layout: contexts/curriculum/seed/<market>/generated/<slug>/<artifact>
 */
export class ArtifactCache {
  constructor(
    private readonly market: 'india' | 'ksa',
    private readonly slug: string,
  ) {}

  private path(name: string): string {
    const repoRoot = process.env.SA_REPO_ROOT ?? process.cwd()
    return resolve(repoRoot, 'contexts/curriculum/seed', this.market, 'generated', this.slug, name)
  }

  async get<T>(name: string): Promise<T | null> {
    try {
      const raw = await readFile(this.path(name), 'utf8')
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  async set<T>(name: string, value: T): Promise<void> {
    const p = this.path(name)
    await mkdir(dirname(p), { recursive: true })
    await writeFile(p, JSON.stringify(value, null, 2), 'utf8')
  }

  async writeText(name: string, text: string): Promise<void> {
    const p = this.path(name)
    await mkdir(dirname(p), { recursive: true })
    await writeFile(p, text, 'utf8')
  }
}
