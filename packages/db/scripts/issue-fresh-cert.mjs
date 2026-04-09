import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g,'')
}
const USER = 'cmnop2b1f0000q67f0gjbcei9'
const API = 'http://localhost:4000'

// 1. start fresh grand test
const startRes = await fetch(`${API}/grand-test/start`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ userId: USER }),
})
const start = await startRes.json()
console.log('start ok, attempt:', start.attemptId)

// 2. read answer key from DB (test cheat)
const { PrismaClient } = await import('@prisma/client')
const p = new PrismaClient()
const attempt = await p.assessmentAttempt.findUnique({ where: { id: start.attemptId } })
const answers = {}
for (const k of attempt.payload.answerKey) answers[k.questionId] = k.answer

// 3. submit
const subRes = await fetch(`${API}/grand-test/submit`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ userId: USER, attemptId: start.attemptId, answers }),
})
const sub = await subRes.json()
console.log('submit:', JSON.stringify(sub))
await p.$disconnect()
