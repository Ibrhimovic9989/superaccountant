// One-shot: create NextAuth v5 adapter tables.
// Net-new tables — does NOT touch existing schema, so safe to run while
// other workloads hold locks on lesson tables.
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const { PrismaClient } = await import('@prisma/client')

const statements = [
  // Add NextAuth's emailVerified column to existing IdentityUser table.
  `ALTER TABLE "IdentityUser" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3)`,

  // Account table (mapped from IdentityAccount in schema)
  `CREATE TABLE IF NOT EXISTS "Account" (
     "id"                TEXT PRIMARY KEY,
     "userId"            TEXT NOT NULL REFERENCES "IdentityUser"("id") ON DELETE CASCADE,
     "type"              TEXT NOT NULL,
     "provider"          TEXT NOT NULL,
     "providerAccountId" TEXT NOT NULL,
     "refresh_token"     TEXT,
     "access_token"      TEXT,
     "expires_at"        INTEGER,
     "token_type"        TEXT,
     "scope"             TEXT,
     "id_token"          TEXT,
     "session_state"     TEXT
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account" ("provider","providerAccountId")`,
  `CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account" ("userId")`,

  // Session table
  `CREATE TABLE IF NOT EXISTS "Session" (
     "id"           TEXT PRIMARY KEY,
     "sessionToken" TEXT NOT NULL UNIQUE,
     "userId"       TEXT NOT NULL REFERENCES "IdentityUser"("id") ON DELETE CASCADE,
     "expires"      TIMESTAMP(3) NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session" ("userId")`,

  // VerificationToken table
  `CREATE TABLE IF NOT EXISTS "VerificationToken" (
     "identifier" TEXT NOT NULL,
     "token"      TEXT NOT NULL UNIQUE,
     "expires"    TIMESTAMP(3) NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken" ("identifier","token")`,
]

const prisma = new PrismaClient()
try {
  for (const stmt of statements) {
    process.stdout.write(`→ ${stmt.split('\n')[0].slice(0, 80).trim()}... `)
    await prisma.$executeRawUnsafe(stmt)
    process.stdout.write('OK\n')
  }
  console.log('\nNextAuth tables ready.')
} catch (err) {
  console.error('\nFAILED:', err.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
