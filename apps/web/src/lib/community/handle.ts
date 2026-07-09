import 'server-only'
import { prisma } from '@sa/db'

/**
 * Auto-generate a URL-safe handle from a user's name (or email fallback)
 * and reserve it in `CommunityProfile`. Runs on:
 *   - first sign-in when no profile exists yet
 *   - the /settings/profile page (student changes handle — one edit)
 *   - the backfill script for existing users
 *
 * Collision policy: append -2, -3, … until we hit an unused handle.
 * Case-insensitive check because CommunityProfile has a `lower(handle)`
 * UNIQUE index. Reserved words (admin, api, settings, etc.) are baked
 * into RESERVED_HANDLES so a student can't take a URL that shadows an
 * app route.
 */

const RESERVED_HANDLES = new Set([
  'admin', 'api', 'app', 'auth', 'blog', 'cohort', 'community', 'compose',
  'dashboard', 'docs', 'feed', 'grand-test', 'guides', 'insights', 'jobs',
  'journal', 'lessons', 'me', 'my-progress', 'notifications', 'p', 'pay',
  'pricing', 'privacy', 'profile', 'quiz', 'recruiters', 'roadmap',
  'search', 'settings', 'sign-in', 'sign-out', 'sign-up', 'students',
  'superaccountant', 'terms', 'test', 'u', 'verify', 'welcome', 'you',
])

const MIN_HANDLE_LENGTH = 3
const MAX_HANDLE_LENGTH = 24

/** Turn "Mohammed Ibrahim!" into "mohammed-ibrahim". */
export function normaliseHandleSeed(seed: string): string {
  const cleaned = seed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/@.*$/, '') // strip email domain if this is an email
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_HANDLE_LENGTH)
  return cleaned || 'student'
}

async function isTaken(candidate: string): Promise<boolean> {
  if (RESERVED_HANDLES.has(candidate.toLowerCase())) return true
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "CommunityProfile" WHERE lower("handle") = lower($1) LIMIT 1`,
    candidate,
  )
  return rows.length > 0
}

/** Returns a fresh handle guaranteed to be free at the moment of the check. */
export async function generateHandle(seed: string): Promise<string> {
  const base = normaliseHandleSeed(seed)
  const padded = base.length < MIN_HANDLE_LENGTH ? `${base}-student` : base
  if (!(await isTaken(padded))) return padded
  // Collision — bump a numeric suffix. Cap at 999 so we never spin
  // forever if a bug produces a hot-key.
  for (let n = 2; n < 1000; n++) {
    const trimmed = padded.slice(0, MAX_HANDLE_LENGTH - String(n).length - 1)
    const candidate = `${trimmed}-${n}`
    if (!(await isTaken(candidate))) return candidate
  }
  // Extremely unlikely — fall back to a random suffix.
  return `${padded.slice(0, 16)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Validate a user-chosen handle. Returns the normalised form if OK,
 * or an error message string if it's rejected. Called from the
 * one-time handle-edit path in /settings/profile.
 */
export async function validateHandleEdit(
  candidate: string,
  currentUserId: string,
): Promise<{ ok: true; handle: string } | { ok: false; error: string }> {
  const normalised = normaliseHandleSeed(candidate)
  if (normalised.length < MIN_HANDLE_LENGTH) {
    return { ok: false, error: `Handle must be at least ${MIN_HANDLE_LENGTH} characters` }
  }
  if (RESERVED_HANDLES.has(normalised)) {
    return { ok: false, error: 'That handle is reserved' }
  }
  const rows = await prisma.$queryRawUnsafe<{ userId: string }[]>(
    `SELECT "userId" FROM "CommunityProfile" WHERE lower("handle") = lower($1) LIMIT 1`,
    normalised,
  )
  const existing = rows[0]
  if (existing && existing.userId !== currentUserId) {
    return { ok: false, error: 'That handle is taken' }
  }
  return { ok: true, handle: normalised }
}
