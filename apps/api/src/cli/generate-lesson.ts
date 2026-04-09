// Load repo-root .env BEFORE any imports that touch process.env.
// (no dotenv dependency — kept zero-dep on purpose)
import { readFileSync as _readFileSync } from 'node:fs'
import { resolve as _resolve } from 'node:path'
const _envPath = _resolve(process.env.SA_REPO_ROOT ?? process.cwd(), '.env')
try {
  for (const _line of _readFileSync(_envPath, 'utf8').split('\n')) {
    const _m = /^([A-Z0-9_]+)=(.*)$/.exec(_line.trim())
    if (_m && !process.env[_m[1]!]) process.env[_m[1]!] = _m[2]!.replace(/^"|"$/g, '')
  }
} catch {
  // .env optional — env may already be set by the shell
}

/**
 * CLI entry: generate one lesson or a whole track.
 *
 * Usage:
 *   pnpm --filter @sa/api exec tsx src/cli/generate-lesson.ts --slug ksa-vat-introduction
 *   pnpm --filter @sa/api exec tsx src/cli/generate-lesson.ts --market india --all
 *   pnpm --filter @sa/api exec tsx src/cli/generate-lesson.ts --market ksa --phase 3
 *
 * Flags:
 *   --slug <slug>      generate one lesson by slug
 *   --market <m>       india | ksa
 *   --phase <n>        only this phase (with --market)
 *   --all              generate everything for the market
 *   --auto-approve     skip publish_lesson permission gate
 */

import { loadEnv } from '@sa/config'
import { flattenLessons, generateLesson, loadTopics } from '../contexts/curriculum/application/generate-lesson'

type Args = {
  slug?: string
  market?: 'india' | 'ksa'
  phase?: number
  all: boolean
  autoApprove: boolean
}

function parseArgs(argv: string[]): Args {
  const out: Args = { all: false, autoApprove: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--slug') out.slug = argv[++i]
    else if (a === '--market') out.market = argv[++i] as 'india' | 'ksa'
    else if (a === '--phase') out.phase = Number(argv[++i])
    else if (a === '--all') out.all = true
    else if (a === '--auto-approve') out.autoApprove = true
  }
  return out
}

async function main() {
  loadEnv() // fail fast on bad env
  const args = parseArgs(process.argv.slice(2))

  if (!args.slug && !args.market) {
    console.error('Specify --slug <slug> or --market <india|ksa>')
    process.exit(1)
  }

  // Determine which lessons to run
  type Job = {
    market: 'india' | 'ksa'
    phase: number
    module: string
    trackCode?: string
    lesson: import('../contexts/curriculum/application/generate-lesson').LessonSeedT
  }
  const jobs: Job[] = []

  const markets: ('india' | 'ksa')[] = args.market ? [args.market] : ['india', 'ksa']
  for (const market of markets) {
    const topics = await loadTopics(market)
    for (const item of flattenLessons(topics)) {
      if (args.slug && item.lesson.slug !== args.slug) continue
      if (args.phase && item.phase !== args.phase) continue
      if (!args.slug && !args.all && !args.phase) continue
      jobs.push({
        market,
        phase: item.phase,
        module: item.module,
        trackCode: item.trackCode,
        lesson: item.lesson,
      })
    }
  }

  if (jobs.length === 0) {
    console.error('No lessons matched the filter.')
    process.exit(1)
  }

  console.log(`[generate-lesson] running ${jobs.length} job(s)`)

  for (const job of jobs) {
    console.log(`\n──── ${job.market} / ${job.module} / ${job.lesson.slug} ────`)
    let toolCount = 0
    for await (const event of generateLesson({
      market: job.market,
      phase: job.phase,
      module: job.module,
      trackCode: job.trackCode,
      lesson: job.lesson,
      autoApprove: args.autoApprove,
      onProgress: (e) => console.log(`  · [${e.tool}] ${e.message}`),
    })) {
      switch (event.type) {
        case 'tool_call':
          toolCount++
          console.log(`  → tool_call: ${event.tool}`)
          break
        case 'tool_result':
          if (event.result.ok) console.log(`  ← tool_result: ${event.tool} OK`)
          else console.error(`  ✖ tool_result: ${event.tool} FAILED — ${event.result.error}`)
          break
        case 'usage':
          // verbose: tokens per turn
          break
        case 'done':
          console.log(`  ⏹  done: ${event.reason} (${toolCount} tool calls)`)
          break
        case 'error':
          console.error(`  ‼  agent error: ${event.error}`)
          break
      }
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
