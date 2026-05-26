/**
 * Shared types for the careers context. Match the columns created in
 * packages/db/scripts/add-careers-tables.mjs. Per CLAUDE.md §3.4 (LSP),
 * the service + repo boundary returns these — never raw Prisma rows.
 */

import type { CompanyStatus } from './approval'

export type CompanyMemberRole = 'owner' | 'hr'

export type Company = {
  id: string
  name: string
  slug: string
  websiteUrl: string | null
  logoUrl: string | null
  about: string | null
  country: string
  city: string
  state: string | null
  postalCode: string | null
  status: CompanyStatus
  approvedAt: Date | null
  approvedByUserId: string | null
  suspendedAt: Date | null
  suspendReason: string | null
  createdAt: Date
  updatedAt: Date
}

export type CompanyMember = {
  id: string
  companyId: string
  userId: string
  role: CompanyMemberRole
  createdAt: Date
}

export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship'
export type JobStatus = 'open' | 'closed' | 'filled'

export type Job = {
  id: string
  companyId: string
  title: string
  description: string
  skills: string[]
  employmentType: EmploymentType
  experienceMinYears: number | null
  experienceMaxYears: number | null
  salaryCurrency: string | null
  salaryMinMinor: number | null
  salaryMaxMinor: number | null
  remoteAllowed: boolean
  country: string
  city: string
  state: string | null
  postalCode: string | null
  status: JobStatus
  publishedAt: Date
  closedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type ApplicationStatus = 'submitted' | 'shortlisted' | 'rejected' | 'hired'

export type JobApplication = {
  id: string
  jobId: string
  candidateUserId: string
  resumeUrl: string
  resumeFilename: string | null
  coverLetter: string | null
  candidateName: string
  candidateEmail: string
  candidatePhone: string | null
  candidateGrandTestScore: number | null
  candidateCohortPhase: number | null
  status: ApplicationStatus
  statusReason: string | null
  createdAt: Date
  updatedAt: Date
}
