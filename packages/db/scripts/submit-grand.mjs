// Smoke test: start grand test, submit all correct answers, verify certificate.
const USER = 'cmnop2b1f0000q67f0gjbcei9'
const API = 'http://localhost:4000'

// 1. start
const startRes = await fetch(`${API}/grand-test/start`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ userId: USER }),
})
const start = await startRes.json()
console.log('start:', { attemptId: start.attemptId, qCount: start.questions.length })

// We don't know the correct answers from the questions returned (deliberately).
// To test the success path, we cheat by reading the answer key directly via Prisma.
const { readFileSync } = await import('node:fs')
const { resolve, dirname } = await import('node:path')
const { fileURLToPath } = await import('node:url')
const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(
  'c:/Users/camun/Documents/superaccountant ksa/packages/db/.env',
  'utf8',
).split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
const { PrismaClient } = await import('@prisma/client')
const p = new PrismaClient()
const attempt = await p.assessmentAttempt.findUnique({ where: { id: start.attemptId } })
const answerKey = attempt.payload.answerKey
const answers = {}
for (const k of answerKey) answers[k.questionId] = k.answer
console.log(`got ${Object.keys(answers).length} answers from key`)

// 2. submit all correct
const subRes = await fetch(`${API}/grand-test/submit`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ userId: USER, attemptId: start.attemptId, answers }),
})
const sub = await subRes.json()
console.log('submit:', sub)

// 3. verify the certificate via the public endpoint
if (sub.certificateHash) {
  const verRes = await fetch(`${API}/verify/${sub.certificateHash}`)
  const ver = await verRes.json()
  console.log('verify:', ver)
}

await p.$disconnect()
