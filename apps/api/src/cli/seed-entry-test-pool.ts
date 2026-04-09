// Load repo-root .env BEFORE any imports that touch process.env.
import { readFileSync as _readFileSync } from 'node:fs'
import { resolve as _resolve } from 'node:path'
const _envPath = _resolve(process.env.SA_REPO_ROOT ?? process.cwd(), '.env')
try {
  for (const _line of _readFileSync(_envPath, 'utf8').split('\n')) {
    const _m = /^([A-Z0-9_]+)=(.*)$/.exec(_line.trim())
    if (_m && !process.env[_m[1]!]) process.env[_m[1]!] = _m[2]!.replace(/^"|"$/g, '')
  }
} catch {}

/**
 * Seed the EntryTestQuestionPool table with ~150 questions per market+locale.
 *
 * One-time cost: ~10 Azure batches per pool (each batch ≈ 15 questions).
 * After seeding, the entry test serves questions from the pool — zero Azure
 * cost per student session.
 *
 * Idempotent: re-running tops up missing topic/difficulty combinations only.
 *
 * Usage:
 *   pnpm --filter @sa/api exec tsx src/cli/seed-entry-test-pool.ts \
 *     --market india --locale en
 */

import { z } from 'zod'
import { azureOpenAI } from '@sa/ai'
import { prisma } from '@sa/db'
import { loadEnv } from '@sa/config'

loadEnv()

// ─── Topic catalogue per market ─────────────────────────────────────────────
const INDIA_TOPICS = [
  // Foundations
  { topic: 'accounting-equation', module: 'Foundations' },
  { topic: 'double-entry-rules', module: 'Foundations' },
  { topic: 'accrual-vs-cash-basis', module: 'Foundations' },
  { topic: 'matching-principle', module: 'Foundations' },
  { topic: 'revenue-recognition', module: 'Foundations' },
  { topic: 'going-concern', module: 'Foundations' },
  // Books & vouchers
  { topic: 'voucher-types', module: 'Books' },
  { topic: 'bank-reconciliation', module: 'Books' },
  { topic: 'classification-of-accounts', module: 'Books' },
  { topic: 'trial-balance-errors', module: 'Books' },
  // Tally
  { topic: 'tally-vouchers', module: 'Tally' },
  { topic: 'tally-groups-ledgers', module: 'Tally' },
  // Inventory
  { topic: 'fifo-method', module: 'Inventory' },
  { topic: 'weighted-average', module: 'Inventory' },
  { topic: 'inventory-valuation', module: 'Inventory' },
  // Final accounts
  { topic: 'schedule-iii-pl', module: 'Final Accounts' },
  { topic: 'schedule-iii-bs', module: 'Final Accounts' },
  { topic: 'depreciation-slm-wdv', module: 'Final Accounts' },
  { topic: 'cash-flow-statement', module: 'Final Accounts' },
  // GST
  { topic: 'gst-types-cgst-sgst-igst', module: 'GST' },
  { topic: 'gst-place-of-supply', module: 'GST' },
  { topic: 'gst-time-of-supply', module: 'GST' },
  { topic: 'gst-input-tax-credit', module: 'GST' },
  { topic: 'gst-rcm', module: 'GST' },
  { topic: 'gst-composition-scheme', module: 'GST' },
  { topic: 'gst-eway-bill', module: 'GST' },
  { topic: 'gst-e-invoicing', module: 'GST' },
  { topic: 'gstr-1', module: 'GST' },
  { topic: 'gstr-3b', module: 'GST' },
  { topic: 'gstr-2b-recon', module: 'GST' },
  // TDS
  { topic: 'tds-194c', module: 'TDS' },
  { topic: 'tds-194j', module: 'TDS' },
  { topic: 'tds-194q', module: 'TDS' },
  { topic: 'tds-disallowance-40aia', module: 'TDS' },
  // Income tax
  { topic: 'house-property', module: 'Income Tax' },
  { topic: 'capital-gains', module: 'Income Tax' },
  { topic: 'pgbp-section-44ab', module: 'Income Tax' },
  { topic: 'old-vs-new-regime', module: 'Income Tax' },
  // Companies Act
  { topic: 'aoc-4-mgt-7', module: 'Companies Act' },
  { topic: 'caro-2020', module: 'Companies Act' },
  // Audit / payroll
  { topic: 'pf-esi-pt', module: 'Payroll' },
  { topic: 'audit-types', module: 'Audit' },
]

const KSA_TOPICS = [
  { topic: 'ifrs-vs-gaap', module: 'IFRS' },
  { topic: 'ifrs-15-revenue', module: 'IFRS' },
  { topic: 'ifrs-16-leases', module: 'IFRS' },
  { topic: 'ifrs-9-ecl', module: 'IFRS' },
  { topic: 'ias-2-inventory', module: 'IFRS' },
  { topic: 'going-concern', module: 'IFRS' },
  { topic: 'vat-standard-rate', module: 'VAT' },
  { topic: 'vat-zero-rated-vs-exempt', module: 'VAT' },
  { topic: 'vat-place-of-supply', module: 'VAT' },
  { topic: 'vat-rcm-imports', module: 'VAT' },
  { topic: 'vat-input-recovery', module: 'VAT' },
  { topic: 'vat-blocked-credits', module: 'VAT' },
  { topic: 'vat-returns', module: 'VAT' },
  { topic: 'fatoora-phase1', module: 'Fatoora' },
  { topic: 'fatoora-phase2', module: 'Fatoora' },
  { topic: 'fatoora-xml-uuid', module: 'Fatoora' },
  { topic: 'zakat-base', module: 'Zakat' },
  { topic: 'zakat-mixed-entities', module: 'Zakat' },
  { topic: 'wht-rates', module: 'WHT' },
  { topic: 'wht-dtaa', module: 'WHT' },
  { topic: 'gosi-rates', module: 'Payroll' },
  { topic: 'wps-compliance', module: 'Payroll' },
  { topic: 'eosb', module: 'Payroll' },
  { topic: 'companies-law-llc', module: 'Companies Law' },
  { topic: 'rett-overview', module: 'RETT' },
  { topic: 'transfer-pricing-local-file', module: 'TP' },
  { topic: 'cbcr', module: 'TP' },
  { topic: 'audit-process-zatca', module: 'Audit' },
]

const QuestionSchema = z.object({
  prompt: z.string(),
  choices: z.array(z.string()).length(4),
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
})

type GeneratedQuestion = z.infer<typeof QuestionSchema>

// ─── Args ───────────────────────────────────────────────────────────────────
type Args = { market: 'india' | 'ksa'; locale: 'en' | 'ar'; perTopic: number; force: boolean }

function parseArgs(argv: string[]): Args {
  const out: Args = { market: 'india', locale: 'en', perTopic: 4, force: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--market') out.market = argv[++i] as 'india' | 'ksa'
    else if (a === '--locale') out.locale = argv[++i] as 'en' | 'ar'
    else if (a === '--per-topic') out.perTopic = Number(argv[++i])
    else if (a === '--force') out.force = true
  }
  return out
}

// ─── Azure call: one batch per (topic) generates `perTopic` questions ──────
async function generateBatch(args: {
  market: 'india' | 'ksa'
  locale: 'en' | 'ar'
  topic: string
  module: string
  perTopic: number
}): Promise<GeneratedQuestion[]> {
  const jurisdiction =
    args.market === 'india'
      ? 'Indian accounting (Companies Act 2013, Income Tax Act, GST, Tally, ICAI standards)'
      : 'KSA accounting (ZATCA regulations, VAT Implementing Regulations, Zakat Bylaws, IFRS as endorsed by SOCPA)'

  const langInstruction =
    args.locale === 'ar'
      ? 'Output the prompt and choices in Modern Standard Arabic.'
      : 'Output the prompt and choices in English.'

  const SYSTEM = `You generate accounting placement test questions for ${jurisdiction}.
${langInstruction}

You MUST return exactly ${args.perTopic} multiple-choice questions on the topic "${args.topic}"
(module: ${args.module}). Distribute roughly: 1 easy, 1-2 medium, 1 hard.

Each question must:
- Be self-contained (no images, no references to "the textbook")
- Have exactly one correct answer
- Have exactly 4 choices
- Be answerable from common knowledge of the topic, not memorisation of section numbers

Return STRICT JSON: { "questions": [ { "prompt", "choices" (4), "answerIndex", "explanation" }, ... ] }
"answerIndex" is the 0-based index of the correct choice.
"explanation" is one short sentence.`

  const res = await azureOpenAI().chat.completions.create({
    model: 'placeholder',
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Generate the ${args.perTopic} questions now.` },
    ],
    response_format: { type: 'json_object' },
  })
  const parsed = JSON.parse(res.choices[0]?.message.content ?? '{}') as { questions?: unknown[] }
  return z.array(QuestionSchema).parse(parsed.questions ?? [])
}

// ─── Insert helper ──────────────────────────────────────────────────────────
async function insertBatch(args: {
  market: 'india' | 'ksa'
  locale: 'en' | 'ar'
  topic: string
  questions: GeneratedQuestion[]
}) {
  const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'medium', 'hard']
  for (let i = 0; i < args.questions.length; i++) {
    const q = args.questions[i]!
    const id = `etq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    const difficulty = difficulties[i] ?? 'medium'
    await prisma.$executeRawUnsafe(
      `INSERT INTO "EntryTestQuestionPool"
         ("id","market","locale","topic","difficulty","prompt","choices","answerIndex","explanation")
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)`,
      id,
      args.market,
      args.locale,
      args.topic,
      difficulty,
      q.prompt,
      JSON.stringify(q.choices),
      q.answerIndex,
      q.explanation,
    )
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2))
  console.log(`[seed] market=${args.market} locale=${args.locale} perTopic=${args.perTopic}`)

  const topics = args.market === 'india' ? INDIA_TOPICS : KSA_TOPICS
  let inserted = 0
  let skipped = 0

  for (const t of topics) {
    if (!args.force) {
      // Skip topics already covered
      const existing = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT count(*) as count FROM "EntryTestQuestionPool"
         WHERE market = $1 AND locale = $2 AND topic = $3`,
        args.market,
        args.locale,
        t.topic,
      )
      const count = Number(existing[0]?.count ?? 0)
      if (count >= args.perTopic) {
        console.log(`  · skip ${t.topic} (${count} already)`)
        skipped++
        continue
      }
    }

    process.stdout.write(`  → ${t.topic} ... `)
    try {
      const qs = await generateBatch({ ...args, topic: t.topic, module: t.module })
      await insertBatch({ market: args.market, locale: args.locale, topic: t.topic, questions: qs })
      inserted += qs.length
      process.stdout.write(`+${qs.length}\n`)
    } catch (err) {
      process.stdout.write(`FAILED — ${(err as Error).message}\n`)
    }
  }

  const total = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT count(*) as count FROM "EntryTestQuestionPool" WHERE market = $1 AND locale = $2`,
    args.market,
    args.locale,
  )
  console.log(
    `\nDone. Inserted ${inserted}, skipped ${skipped}. Pool size: ${total[0]?.count ?? 0}`,
  )
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
