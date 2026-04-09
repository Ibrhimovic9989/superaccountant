import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
const { PrismaClient } = await import('@prisma/client')
const p = new PrismaClient()

const stmts = [
  `CREATE TABLE IF NOT EXISTS "EntryTestQuestionPool" (
     "id"          TEXT PRIMARY KEY,
     "market"      TEXT NOT NULL,
     "locale"      TEXT NOT NULL,
     "topic"       TEXT NOT NULL,
     "difficulty"  TEXT NOT NULL,
     "prompt"      TEXT NOT NULL,
     "choices"     JSONB NOT NULL,
     "answerIndex" INTEGER NOT NULL,
     "explanation" TEXT NOT NULL,
     "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "EntryTestQuestionPool_market_locale_difficulty_idx"
     ON "EntryTestQuestionPool" ("market","locale","difficulty")`,
  `CREATE INDEX IF NOT EXISTS "EntryTestQuestionPool_market_locale_topic_idx"
     ON "EntryTestQuestionPool" ("market","locale","topic")`,
]
for (const s of stmts) {
  process.stdout.write(`→ ${s.split('\n')[0].slice(0, 80).trim()}... `)
  await p.$executeRawUnsafe(s)
  process.stdout.write('OK\n')
}
console.log('\nEntryTestQuestionPool ready.')
await p.$disconnect()
