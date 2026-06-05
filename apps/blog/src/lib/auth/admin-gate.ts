/**
 * Admin gate for the blog. Mirrors the spirit of
 * apps/web/src/lib/cohort/access.ts but stays local to apps/blog so
 * we don't reach across app boundaries (CLAUDE.md §3.5).
 *
 * Blog admin = IdentityUser.role = 'admin'. Today only seeded admins
 * (e.g. ibrahimshaheer75@gmail.com) match; the SuperAccountant team
 * promotes new editors by flipping role in the DB.
 */

import { redirect } from 'next/navigation'
import { prisma } from '@sa/db'
import { auth } from './index'

export async function isUserAdmin(userId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ role: string }[]>`
    SELECT "role" FROM "IdentityUser" WHERE "id" = ${userId} LIMIT 1
  `
  const role = rows[0]?.role ?? 'student'
  return role === 'admin'
}

/**
 * Page guard for /admin/* routes. Redirects:
 *   not signed in       → /sign-in
 *   signed in, non-admin → /sign-in?error=admin-only
 * Returns { userId } on success.
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const session = await auth()
  if (!session?.user?.id) redirect('/sign-in')
  const admin = await isUserAdmin(session.user.id)
  if (!admin) redirect('/sign-in?error=admin-only')
  return { userId: session.user.id }
}
