// One-off: add `progressEmailSentAt` to AssessmentAttempt (daily + grand)
// and to EntryTestSession (entry test stores its sessions there, not in
// AssessmentAttempt). The column is the idempotency latch for the new
// progress-card email — once stamped, the post-grading hook skips re-send
// even across retries / Resend transient failures.
//
// Partial indices cover the "needs email" lookup path (rare, fast).
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
const { PrismaClient } = await import('@prisma/client')
const p = new PrismaClient()

await p.$executeRawUnsafe(`
  ALTER TABLE "AssessmentAttempt"
  ADD COLUMN IF NOT EXISTS "progressEmailSentAt" TIMESTAMP(3)
`)
console.log('✓ AssessmentAttempt.progressEmailSentAt')

await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "AssessmentAttempt_progress_email_idx"
  ON "AssessmentAttempt" ("progressEmailSentAt")
  WHERE "progressEmailSentAt" IS NULL
`)
console.log('✓ AssessmentAttempt_progress_email_idx (partial)')

await p.$executeRawUnsafe(`
  ALTER TABLE "EntryTestSession"
  ADD COLUMN IF NOT EXISTS "progressEmailSentAt" TIMESTAMP(3)
`)
console.log('✓ EntryTestSession.progressEmailSentAt')

await p.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "EntryTestSession_progress_email_idx"
  ON "EntryTestSession" ("progressEmailSentAt")
  WHERE "progressEmailSentAt" IS NULL
`)
console.log('✓ EntryTestSession_progress_email_idx (partial)')

await p.$disconnect()
console.log('\nDone')
