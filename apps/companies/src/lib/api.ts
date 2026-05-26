/**
 * Server-side client for the careers REST API (NestJS, on
 * api.superaccountant.in). All calls are made from server
 * components / server actions, so CORS does not apply.
 *
 * The API trusts the `userId` we pass (same pattern as the entry-test
 * flow) — we only ever pass the authenticated session's user id, never
 * a client-supplied one. HARDENING TODO: switch the API to verify a
 * signed session token instead of trusting the body userId.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`[careers-api] ${path} → ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

// ── Types (mirror the API DTOs) ───────────────────────────────

export type CompanyStatus = 'pending_approval' | 'approved' | 'suspended'

export type Company = {
  id: string
  name: string
  slug: string
  websiteUrl: string | null
  about: string | null
  country: string
  city: string
  state: string | null
  postalCode: string | null
  status: CompanyStatus
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
  remoteAllowed: boolean
  country: string
  city: string
  state: string | null
  status: JobStatus
  publishedAt: string
}

export type ApplicationStatus = 'submitted' | 'shortlisted' | 'rejected' | 'hired'

export type JobApplication = {
  id: string
  jobId: string
  resumeUrl: string
  resumeFilename: string | null
  coverLetter: string | null
  candidateName: string
  candidateEmail: string
  candidatePhone: string | null
  candidateGrandTestScore: number | null
  candidateCohortPhase: number | null
  status: ApplicationStatus
  createdAt: string
}

// ── Companies ─────────────────────────────────────────────────

export function getCompanyForUser(userId: string) {
  return apiPost<{ company: Company | null }>('/companies/me', { userId })
}

export function signupCompany(input: {
  userId: string
  name: string
  websiteUrl?: string | null
  about?: string | null
  country: string
  city: string
  state?: string | null
  postalCode?: string | null
}) {
  return apiPost<{ company: Company }>('/companies/signup', input)
}

// ── Jobs ──────────────────────────────────────────────────────

export function createJob(input: {
  userId: string
  title: string
  description: string
  skills?: string[]
  employmentType: EmploymentType
  experienceMinYears?: number | null
  experienceMaxYears?: number | null
  remoteAllowed?: boolean
  country: string
  city: string
  state?: string | null
  postalCode?: string | null
}) {
  return apiPost<Job>('/jobs/create', input)
}

export function listJobsForCompany(userId: string, status?: JobStatus) {
  return apiPost<{ jobs: Job[] }>('/jobs/for-company', { userId, status })
}

export function closeJob(userId: string, jobId: string) {
  return apiPost<Job>('/jobs/close', { userId, jobId })
}

// ── Applications ──────────────────────────────────────────────

export function listApplicationsForJob(jobId: string, status?: ApplicationStatus) {
  return apiPost<{ applications: JobApplication[] }>('/applications/for-job', { jobId, status })
}

export function updateApplicationStatus(input: {
  applicationId: string
  nextStatus: ApplicationStatus
  reason?: string | null
}) {
  return apiPost<JobApplication>('/applications/update-status', input)
}
