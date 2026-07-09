'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import {
  approveRecruiterAccess,
  isAdmin,
  requestRecruiterAccess,
} from './recruiter-store'

/**
 * Server actions for the recruiter side. Kept in a separate file from
 * the student-facing community actions.ts so admin operations can't
 * accidentally get exposed alongside a like-toggle.
 */

async function requireUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) redirect('/en/sign-in')
  return session.user.id
}

// ── Apply for recruiter access ──────────────────────────────

const ApplySchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  companyDomain: z.string().trim().max(120),
  notes: z.string().trim().max(500).optional(),
})

export async function applyForRecruiterAccessAction(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = ApplySchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: 'Please fill in your company name and domain.' }
  }
  const userId = await requireUserId()
  try {
    await requestRecruiterAccess({
      userId,
      companyName: parsed.data.companyName,
      companyDomain: parsed.data.companyDomain,
      notes: parsed.data.notes ?? '',
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message || 'Could not submit right now.' }
  }
}

// ── Admin: approve a recruiter ──────────────────────────────

const ApproveSchema = z.object({
  userId: z.string().min(1),
  notes: z.string().max(500).optional(),
})

export async function approveRecruiterAction(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = ApproveSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'Invalid payload' }
  const actor = await requireUserId()
  if (!(await isAdmin(actor))) {
    return { ok: false, error: 'Admins only.' }
  }
  await approveRecruiterAccess({
    userId: parsed.data.userId,
    approvedBy: actor,
    notes: parsed.data.notes ?? '',
  })
  revalidatePath('/en/admin/recruiter-access')
  return { ok: true }
}
