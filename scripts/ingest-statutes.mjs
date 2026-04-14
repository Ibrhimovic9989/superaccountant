/**
 * Walk contexts/statutes/ for yaml files, embed each section, upsert into StatuteChunk.
 *
 * Usage:
 *   node scripts/ingest-statutes.mjs                  # ingest all
 *   node scripts/ingest-statutes.mjs --jurisdiction=india
 *   node scripts/ingest-statutes.mjs --source=tds.yaml
 *   node scripts/ingest-statutes.mjs --force          # re-embed even if already present
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__d, '..')

for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT
const AZURE_KEY = process.env.AZURE_OPENAI_API_KEY
const EMBED_DEPLOYMENT = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT
const EMBED_API_VERSION = process.env.AZURE_OPENAI_API_VERSION ?? '2024-02-15-preview'

const args = process.argv.slice(2)
const jurisFilter = args.find((a) => a.startsWith('--jurisdiction='))?.split('=')[1]
const sourceFilter = args.find((a) => a.startsWith('--source='))?.split('=')[1]
const force = args.includes('--force')

// ── Resolve prisma + yaml from the packages/db node_modules ──
const prismaClientUrl = pathToFileURL(
  resolve(ROOT, 'packages/db/node_modules/@prisma/client/index.js'),
).href
const { PrismaClient } = await import(prismaClientUrl)
const yamlUrl = pathToFileURL(
  resolve(ROOT, 'apps/api/node_modules/yaml/dist/index.js'),
).href
const YAML = await import(yamlUrl)

const prisma = new PrismaClient()

// ── Embed one or many strings via Azure text-embedding-3-small ──
async function embed(texts) {
  const arr = Array.isArray(texts) ? texts : [texts]
  const res = await fetch(
    `${AZURE_ENDPOINT}/openai/deployments/${EMBED_DEPLOYMENT}/embeddings?api-version=${EMBED_API_VERSION}`,
    {
      method: 'POST',
      headers: { 'api-key': AZURE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: arr }),
    },
  )
  if (!res.ok) throw new Error(`Azure embed ${res.status}: ${await res.text().catch(() => '')}`)
  const data = await res.json()
  return data.data.map((d) => d.embedding)
}

function walkYaml(dir) {
  const results = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const s = statSync(full)
    if (s.isDirectory()) results.push(...walkYaml(full))
    else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) results.push(full)
  }
  return results
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  const statutesDir = resolve(ROOT, 'contexts/statutes')
  const files = walkYaml(statutesDir)
  console.log(`Found ${files.length} YAML files`)

  let total = 0
  let skipped = 0
  let failed = 0

  for (const file of files) {
    if (sourceFilter && !file.endsWith(sourceFilter)) continue
    const raw = readFileSync(file, 'utf8')
    const doc = YAML.parse(raw)
    if (jurisFilter && doc.jurisdiction !== jurisFilter) continue

    console.log(`\n${file}`)
    console.log(`  Source: ${doc.source} (${doc.jurisdiction})`)
    console.log(`  Sections: ${doc.sections.length}`)

    for (const section of doc.sections) {
      const id = `${doc.sourceShort}::${section.code}::${doc.jurisdiction}`
        .replace(/[^a-zA-Z0-9:_-]/g, '_')
        .toLowerCase()

      // Skip if exists and --force not set
      if (!force) {
        const existing = await prisma.$queryRaw`
          SELECT id FROM "StatuteChunk" WHERE id = ${id} LIMIT 1
        `
        if (existing.length > 0) {
          skipped++
          continue
        }
      }

      try {
        // Embed the section code + title + content together — improves retrieval
        // for queries that mention the section number ("what does 194J say?").
        const textToEmbed = `${doc.sourceShort} ${section.code} ${section.title}\n\n${section.content}`
        const [vec] = await embed(textToEmbed)
        const vectorLiteral = `[${vec.join(',')}]`

        await prisma.$executeRawUnsafe(
          `INSERT INTO "StatuteChunk"
           (id, jurisdiction, source, "sourceShort", "sectionCode", "sectionTitle",
            content, locale, "sourceUrl", tags, embedding, "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::text[], $11::vector, NOW())
           ON CONFLICT (source, "sectionCode", locale) DO UPDATE SET
             content = EXCLUDED.content,
             "sectionTitle" = EXCLUDED."sectionTitle",
             tags = EXCLUDED.tags,
             embedding = EXCLUDED.embedding,
             "updatedAt" = NOW()`,
          id,
          doc.jurisdiction,
          doc.source,
          doc.sourceShort,
          section.code,
          section.title,
          section.content.trim(),
          section.locale ?? 'en',
          doc.sourceUrl ?? null,
          doc.tags ?? [],
          vectorLiteral,
        )
        console.log(`  ✓ ${section.code}: ${section.title}`)
        total++
      } catch (err) {
        console.log(`  ✗ ${section.code}: ${err.message}`)
        failed++
      }
    }
  }

  console.log(`\nIngested: ${total}, Skipped: ${skipped}, Failed: ${failed}`)
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
