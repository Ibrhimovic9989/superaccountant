// One-shot: create the careers/companies/jobs schema.
//
//   Company         — employer profile, gated behind approval workflow
//   CompanyMember   — N:1 to Company (1 owner at MVP; multi-HR later)
//   Job             — posted by an approved company; location embedded
//   JobApplication  — candidate (IdentityUser) → Job, with candidate
//                     snapshot so the company sees a stable view even
//                     if the candidate edits their profile later
//
// Also extends the IdentityUser.UserRole enum with 'company_owner' so
// the existing access tier helper can branch on company users without
// a separate boolean column.
//
// Money — if/when we capture salary ranges — uses the *_Minor integer
// convention (CLAUDE.md §8). Locations use ISO-3166 alpha-2 country
// codes + free-text city/state/postal. Google Places autocomplete is
// out of scope for MVP.

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

// ── UserRole enum: add 'company_owner' ───────────────────────
// ADD VALUE IF NOT EXISTS is supported since Postgres 12; Supabase
// runs 15+ so this is safe.
await p.$executeRawUnsafe(`
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'company_owner'
`)
console.log('✓ UserRole += company_owner')

// ── Company ──────────────────────────────────────────────────
// Approval state machine (CLAUDE.md §4.3 — destructive-action gating):
//   pending_approval (initial)  → approved
//                               → suspended (from approved; admin reversible)
//
// Only 'approved' companies can post new jobs. Existing jobs of a
// suspended company stay readable but the company can't mutate them.
await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "about" TEXT,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_approval'
      CHECK ("status" IN ('pending_approval', 'approved', 'suspended')),
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT REFERENCES "IdentityUser"("id") ON DELETE SET NULL,
    "suspendedAt" TIMESTAMP(3),
    "suspendReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
  )
`)
await p.$executeRawUnsafe(
  `CREATE INDEX IF NOT EXISTS "Company_status_idx" ON "Company" ("status")`,
)
console.log('✓ Company table + index')

// ── CompanyMember ────────────────────────────────────────────
// One owner per company at MVP, but the table is shaped for multi-HR
// from day one. The UNIQUE on userId enforces "a user belongs to at
// most one company" — drop this constraint when we let HRs invite
// other HRs across companies, if ever.
await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "CompanyMember" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "IdentityUser"("id") ON DELETE CASCADE,
    "role" TEXT NOT NULL DEFAULT 'owner'
      CHECK ("role" IN ('owner', 'hr')),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
  )
`)
await p.$executeRawUnsafe(
  `CREATE UNIQUE INDEX IF NOT EXISTS "CompanyMember_userId_idx" ON "CompanyMember" ("userId")`,
)
await p.$executeRawUnsafe(
  `CREATE INDEX IF NOT EXISTS "CompanyMember_companyId_idx" ON "CompanyMember" ("companyId")`,
)
console.log('✓ CompanyMember table + indexes')

// ── Job ──────────────────────────────────────────────────────
// Location embedded on the Job row (not a separate JobLocation table)
// — keeps queries simple and matches how most ATS systems store
// per-listing locations. Split to a separate table later if we add
// multi-location postings.
//
// Skills stored as a TEXT[] for trivial filtering; switch to a join
// table when we add skill taxonomy.
await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "Job" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skills" TEXT[] NOT NULL DEFAULT '{}',
    "employmentType" TEXT NOT NULL
      CHECK ("employmentType" IN ('full-time', 'part-time', 'contract', 'internship')),
    "experienceMinYears" INTEGER,
    "experienceMaxYears" INTEGER,
    "salaryCurrency" TEXT,
    "salaryMinMinor" INTEGER,
    "salaryMaxMinor" INTEGER,
    "remoteAllowed" BOOLEAN NOT NULL DEFAULT FALSE,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open'
      CHECK ("status" IN ('open', 'closed', 'filled')),
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
  )
`)
await p.$executeRawUnsafe(
  `CREATE INDEX IF NOT EXISTS "Job_listing_idx" ON "Job" ("status", "publishedAt" DESC)`,
)
await p.$executeRawUnsafe(
  `CREATE INDEX IF NOT EXISTS "Job_company_idx" ON "Job" ("companyId")`,
)
await p.$executeRawUnsafe(
  `CREATE INDEX IF NOT EXISTS "Job_country_idx" ON "Job" ("country")`,
)
console.log('✓ Job table + indexes')

// ── JobApplication ───────────────────────────────────────────
// Apply-time snapshot of the candidate. We resolve the live grand-test
// score and current cohort phase at application time and freeze them
// here — companies see what the candidate looked like when they
// applied, not "whoever they are right now". Helpful for fairness +
// audit.
//
// resumeUrl is a Supabase Storage URL (public bucket 'resumes'); the
// upload happens client-side in the companies/jobs apps.
await p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "JobApplication" (
    "id" TEXT PRIMARY KEY,
    "jobId" TEXT NOT NULL REFERENCES "Job"("id") ON DELETE CASCADE,
    "candidateUserId" TEXT NOT NULL REFERENCES "IdentityUser"("id") ON DELETE CASCADE,
    "resumeUrl" TEXT NOT NULL,
    "resumeFilename" TEXT,
    "coverLetter" TEXT,
    "candidateName" TEXT NOT NULL,
    "candidateEmail" TEXT NOT NULL,
    "candidatePhone" TEXT,
    "candidateGrandTestScore" REAL,
    "candidateCohortPhase" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'submitted'
      CHECK ("status" IN ('submitted', 'shortlisted', 'rejected', 'hired')),
    "statusReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
  )
`)
// One application per (job, candidate). Re-applying is a no-op; the UI
// shows "you already applied" on the second click.
await p.$executeRawUnsafe(
  `CREATE UNIQUE INDEX IF NOT EXISTS "JobApplication_unique_idx"
   ON "JobApplication" ("jobId", "candidateUserId")`,
)
await p.$executeRawUnsafe(
  `CREATE INDEX IF NOT EXISTS "JobApplication_status_idx"
   ON "JobApplication" ("jobId", "status")`,
)
await p.$executeRawUnsafe(
  `CREATE INDEX IF NOT EXISTS "JobApplication_candidate_idx"
   ON "JobApplication" ("candidateUserId", "createdAt" DESC)`,
)
console.log('✓ JobApplication table + indexes')

await p.$disconnect()
console.log('\nCareers tables ready.')
